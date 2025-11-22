console.log("cart.js 已載入");

// =============================
// EmailJS：從後端抓金鑰並初始化
// =============================
let emailjsConfig = null;

fetch("https://espresso-backend.onrender.com/api/emailjs-config")
  .then(res => res.json())
  .then(cfg => {
    emailjsConfig = cfg;
    console.log("EmailJS 設定已載入", cfg);
    emailjs.init(cfg.publicKey);
  })
  .catch(err => console.error("EmailJS 設定抓取失敗：", err));

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

// =============================
// Checkout：表單送出
// =============================
$("#checkout-form").on("submit", function (e) {
  e.preventDefault();

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  if (!emailjsConfig) return alert("Email 系統尚未初始化");
  if (cart.length === 0) return alert("購物車是空的");

  const name = $("#name").val();
  const phone = $("#phone").val();
  const email = $("#email").val();
  const address = $("#address").val();
  const total = $("#cart-total").text();

  const items = cart.map((item) => `${item.name} x${item.qty}`).join("\n");

  // step 1：寄 Email
  emailjs
    .send(emailjsConfig.serviceId, emailjsConfig.templateId, {
      name, phone, email, address, total, items,
    })
    .then(() => {
      console.log("📧 Email 寄出成功");

      // step 2：向後端建立藍新金流訂單
      return fetch("https://espresso-backend.onrender.com/api/newebpay/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, address, total, items }),
      });
    })
    .then(res => res.json())
    .then(pay => {
      // step 3：自動建立表單並跳轉藍新
      const form = $('<form>', {
        method: "POST",
        action: pay.PayGateWay
      });

      form.append($('<input>', { name: "MerchantID", value: pay.MerchantID }));
      form.append($('<input>', { name: "TradeInfo", value: pay.TradeInfo }));
      form.append($('<input>', { name: "TradeSha", value: pay.TradeSha }));
      form.append($('<input>', { name: "Version", value: pay.Version }));

      $("body").append(form);
      form.submit();
    })
    .catch(err => alert("❌ 結帳失敗：" + err.message));
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
