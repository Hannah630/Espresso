console.log("✅ cart.js 已載入");
// =============================
// EmailJS 初始化 (有用到才留)
// =============================
try {
  emailjs.init(EMAILJS_PUBLIC_KEY); // 來自 email-config.js
} catch (e) {
  console.error("EmailJS 初始化失敗", e);
}

// =============================
// 加入購物車邏輯 (事件委派，避免動態按鈕綁不到)
// =============================
$(document).on("click", ".add-to-cart", function () {
  const name = $(this).data("name");
  const price = parseInt($(this).data("price"), 10);
  const img = $(this).data("img");
  const desc = $(this).data("desc") || "";

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const existing = cart.find((item) => item.name === name);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, img, desc, qty: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  loadCart(); // ✅ 立刻刷新 checkout 畫面

  // Toast 提示
  showCartToast(`${name} 已加入購物車`);
});

// =============================
// 顯示 Bootstrap Toast
// =============================
function showCartToast(message) {
  $("#cart-toast-msg").text(message);
  const toastEl = document.getElementById("cartToast");
  if (toastEl) {
    const toast = new bootstrap.Toast(toastEl, { delay: 2000 });
    toast.show();
  }
}

// =============================
// Checkout 表單送出
// =============================
$("#checkout-form").on("submit", function (e) {
  e.preventDefault();

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  if (cart.length === 0) {
    return alert("購物車是空的");
  }

  const name = $("#name").val();
  const phone = $("#phone").val();
  const email = $("#email").val();
  const address = $("#address").val();
  const total = $("#cart-total").text();
  const items = cart.map((item) => `${item.name} x${item.qty}`).join("\n");

  fetch("https://backend-5rze.onrender.com/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, email, address, total, items }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("伺服器錯誤");
      return res.json();
    })
    .then(() => {
      alert("訂單已送出！");
      localStorage.removeItem("cart");
      $("#checkout-form")[0].reset();
      $("#cart-items").html('<p class="text-success">感謝您的訂購！</p>');
      updateCartCount();
    })
    .catch((err) => {
      alert("❌ 發送失敗：" + err.message);
    });
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
// 載入購物車內容 (checkout 頁用)
// =============================
function loadCart() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const $container = $("#cart-items");
  const $total = $("#cart-total");

  if (!$container.length || !$total.length) return;

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
            <h6 class="card-title mb-1">${item.name}</h6>
            <p class="mb-0">單價 NT$${item.price} × ${item.qty} = 
              <strong>NT$${itemTotal}</strong>
            </p>
          </div>
          <div class="btn-group btn-group-sm" role="group">
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

  // 綁定 - 按鈕
  $(".decrease-qty").on("click", function () {
    const index = $(this).data("index");
    if (cart[index].qty > 1) {
      cart[index].qty--;
    } else {
      cart.splice(index, 1);
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
    updateCartCount();
  });

  // 綁定 + 按鈕
  $(".increase-qty").on("click", function () {
    const index = $(this).data("index");
    cart[index].qty++;
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
    updateCartCount();
  });

  // 綁定移除
  $(".remove-item").on("click", function () {
    const index = $(this).data("index");
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
// 頁面載入時初始化
// =============================
$(function () {


  updateCartCount();
  loadCart();
});