const CART_JS_VERSION = "20260325-3";

console.log("cart.js 已載入", { version: CART_JS_VERSION });

const API_BASE_URL =
  !window.location.hostname ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://espresso-backend.onrender.com";

// =============================
// EmailJS：從後端抓金鑰並初始化
// =============================
let emailjsConfig = null;

fetch(`${API_BASE_URL}/api/emailjs-config`)
  .then((res) => res.json())
  .then((cfg) => {
    if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
      emailjsConfig = null;
      console.warn("EmailJS 設定不完整，將略過寄信流程", cfg);
      return;
    }

    emailjsConfig = cfg;
    console.log("EmailJS 設定已載入", cfg);
    emailjs.init(cfg.publicKey);
  })
  .catch((err) => console.error("EmailJS 設定抓取失敗：", err));

// =============================
// 加入購物車邏輯
// =============================
$(document).on("click", ".add-to-cart", function () {
  const name = $(this).data("name");
  const price = parseInt($(this).data("price"), 10);
  const img = $(this).data("img");
  const desc = $(this).data("desc") || "";

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const existing = cart.find((item) => item.name === name);

  if (existing) existing.qty++;
  else cart.push({ name, price, img, desc, qty: 1 });

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  loadCart();

  showCartToast(`${name} 已加入購物車`);
});

// =============================
// Bootstrap Toast
// =============================
function showCartToast(message) {
  $("#cart-toast-msg").text(message);
  const toastEl = document.getElementById("cartToast");
  if (toastEl) new bootstrap.Toast(toastEl, { delay: 2000 }).show();
}

function collectCheckoutData() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");

  return {
    cart,
    payload: {
      name: $("#name").val(),
      phone: $("#phone").val(),
      email: $("#email").val(),
      address: $("#address").val(),
      total: parseInt($("#cart-total").text(), 10),
      items: cart.map((item) => `${item.name} x${item.qty}`).join("\n"),
    },
  };
}

function sendOrderEmail(payload) {
  if (!emailjsConfig) {
    return Promise.resolve();
  }

  return emailjs.send(
    emailjsConfig.serviceId,
    emailjsConfig.templateId,
    payload,
  );
}

function createPaymentFields(pay) {
  const fields = {
    MerchantID: `${pay.MerchantID ?? ""}`.trim(),
    TradeInfo: `${pay.TradeInfo ?? ""}`.trim(),
    TradeSha: `${pay.TradeSha ?? ""}`.trim(),
    Version: `${pay.Version ?? ""}`.trim(),
  };

  const encryptType = `${pay.EncryptType ?? ""}`.trim();

  if (encryptType) {
    fields.EncryptType = encryptType;
  }

  return fields;
}

function storePaymentDebugSnapshot(action, fields) {
  window.__NEWEBPAY_LAST_SUBMISSION__ = {
    version: CART_JS_VERSION,
    action,
    fields: { ...fields },
    createdAt: new Date().toISOString(),
  };

  console.log("即將送出藍新表單", window.__NEWEBPAY_LAST_SUBMISSION__);
}

function createPaymentForm(pay) {
  if (!pay.PayGateWay) {
    throw new Error("藍新付款網址缺失");
  }

  const fields = createPaymentFields(pay);

  document
    .querySelectorAll('form[data-newebpay-form="true"]')
    .forEach((existingForm) => existingForm.remove());

  const form = document.createElement("form");
  form.method = "POST";
  form.action = pay.PayGateWay;
  form.dataset.newebpayForm = "true";

  Object.entries(fields).forEach(([name, value]) => {
    if (!value) {
      throw new Error(`缺少付款欄位：${name}`);
    }

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  storePaymentDebugSnapshot(form.action, fields);

  return form;
}

function getErrorMessage(err) {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (typeof err === "string" && err) {
    return err;
  }

  if (err && typeof err === "object") {
    if (err.message) {
      return err.message;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return "未知錯誤";
    }
  }

  return "未知錯誤";
}

async function requestNewebPayOrder(payload) {
  const response = await fetch(`${API_BASE_URL}/api/newebpay/createOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`付款初始化回應不是 JSON：${rawText || "空回應"}`);
  }

  if (!response.ok) {
    throw new Error(data.message || "付款初始化失敗");
  }

  if (
    !data.MerchantID ||
    !data.TradeInfo ||
    !data.TradeSha ||
    !data.PayGateWay
  ) {
    throw new Error("付款欄位不完整");
  }

  return data;
}

// =============================
// Checkout：表單送出
// =============================
$(document)
  .off("submit", "#checkout-form")
  .on("submit", "#checkout-form", async function (e) {
    e.preventDefault();

    const { cart, payload } = collectCheckoutData();
    const submitButton = $(this).find('button[type="submit"]');
    const originalButtonText = submitButton.text();

    if (cart.length === 0) {
      alert("購物車是空的");
      return;
    }

    submitButton.prop("disabled", true).text("處理中...");

    try {
      const pay = await requestNewebPayOrder(payload);

      sendOrderEmail(payload)
        .then(() => console.log("Email 寄出成功"))
        .catch((err) => console.error("Email 寄送失敗：", err));

      console.log("NewebPay 回傳：", pay);

      const form = createPaymentForm(pay);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("結帳失敗：" + getErrorMessage(err));
      submitButton.prop("disabled", false).text(originalButtonText);
    }
  });

// =============================
// 更新購物車數字
// =============================
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  $("#cart-count").text(count);
  $("#floating-cart-count").text(count);
}

// =============================
// 載入購物車內容
// =============================
function loadCart() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const $container = $("#cart-items");
  const $total = $("#cart-total");

  if (!$container.length) return;

  $container.empty();
  let sum = 0;

  if (cart.length === 0) {
    $container.html('<p class="text-muted text-center">購物車是空的。</p>');
    $total.text("0");
    return;
  }

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    sum += itemTotal;

    $container.append(`
      <div class="card mb-2 shadow-sm">
        <div class="card-body d-flex justify-content-between align-items-center p-2">
          <div>
            <h6>${item.name}</h6>
            <p>單價 NT$${item.price} × ${item.qty} = <strong>NT$${itemTotal}</strong></p>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary decrease-qty" data-index="${index}">-</button>
            <span class="px-2 align-self-center">${item.qty}</span>
            <button class="btn btn-outline-secondary increase-qty" data-index="${index}">+</button>
            <button class="btn btn-outline-danger remove-item" data-index="${index}">移除</button>
          </div>
        </div>
      </div>
    `);
  });

  $total.text(sum);

  $(".decrease-qty").on("click", function () {
    const index = $(this).data("index");
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    if (cart[index].qty > 1) cart[index].qty--;
    else cart.splice(index, 1);

    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
    updateCartCount();
  });

  $(".increase-qty").on("click", function () {
    const index = $(this).data("index");
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    cart[index].qty++;
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
    updateCartCount();
  });

  $(".remove-item").on("click", function () {
    const index = $(this).data("index");
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
    updateCartCount();
  });
}

// =============================
// 跳到購物車頁
// =============================
function goToCart() {
  window.location.href = "checkout.html";
}

// =============================
// 初始載入
// =============================
$(function () {
  updateCartCount();
  loadCart();
});
