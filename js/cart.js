try {
  emailjs.init(EMAILJS_PUBLIC_KEY); // 來自 email-config.js
} catch (e) {
  console.error("EmailJS 初始化失敗", e);
}

const productImages = [
  { src: "pic/product1.png", alt: "研磨壓萃咖啡組" },
  { src: "pic/product6.png", alt: "研磨壓萃咖啡組" },
  { src: "pic/product3.png", alt: "磨豆機G-works" },
  { src: "pic/product2.png", alt: "壓萃機E-works" },
  { src: "pic/product4.png", alt: "PVD鍍膜粉杯" },
  { src: "pic/product5.png", alt: "多功能清潔刷" },
  { src: "pic/product6.png", alt: "多功能清潔刷" },
  { src: "pic/product7.png", alt: "多功能清潔刷" },
];

let currentItem = {
  name: "研磨壓萃咖啡組",
  price: 9800,
  img: "pic/product1.png",
  desc: "內容物：磨豆機+壓萃機+清潔刷",
};

$(function () {
  $(".change-item").on("click", function () {
    currentItem.name = $(this).data("name");
    currentItem.price = parseInt($(this).data("price"));
    currentItem.img = $(this).data("img");
    currentItem.desc = $(this).data("desc") || "";

    $("#product-img").attr("src", currentItem.img);
    $("#product-name").text(currentItem.name);
    $("#product-price").text(currentItem.price);
    $("#product-desc").text(currentItem.desc);

    $(".change-item").removeClass("active");
    $(this).addClass("active");
  });

  $(".product-thumbnail").on("click", function () {
    const name = $(this).data("name");
    const price = parseInt($(this).data("price"));
    const img = $(this).data("img");
    const desc = $(this).data("desc") || "";

    currentItem = { name, price, img, desc };
    $("#product-img").attr("src", img);
    $("#product-name").text(name);
    $("#product-price").text(price);
    $("#product-desc").text(desc);

    $(".change-item").removeClass("active");

    const index = productImages.findIndex((p) => p.src === img);
    openImageCarousel(index);
  });

  $("#product-img").on("click", function () {
    const index = productImages.findIndex((img) => img.src === currentItem.img);
    openImageCarousel(index);
  });

  $("#add-to-cart").on("click", function () {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find((item) => item.name === currentItem.name);

    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...currentItem, qty: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    alert(`${currentItem.name} 已加入購物車`);
  });

  $("#checkout-form").on("submit", function (e) {
    e.preventDefault();

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart.length === 0) return alert("購物車是空的");

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
        alert("✅ 訂單已送出！");
        localStorage.removeItem("cart");
        $("#checkout-form")[0].reset();
        $("#cart-items").html('<p class="text-success">感謝您的訂購！</p>');
        updateCartCount();
      })
      .catch((err) => {
        alert("❌ 發送失敗：" + err.message);
      });
  });

  updateCartCount();
  loadCart();
});

function openImageCarousel(activeIndex = 0) {
  const $carousel = $("#carousel-images");
  $carousel.empty();

  productImages.forEach((img, i) => {
    const activeClass = i === activeIndex ? "active" : "";
    $carousel.append(`
      <div class="carousel-item ${activeClass}">
        <img src="${img.src}" class="d-block w-100" style="object-fit: contain; max-height: 80vh;" alt="${img.alt}">
      </div>
    `);
  });

  const modal = new bootstrap.Modal(document.getElementById("imageModal"));
  modal.show();
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  $("#cart-count").text(count);
  $("#floating-cart-count").text(count);
}

function goToCart() {
  window.location.href = "checkout.html";
}

function loadCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const $container = $("#cart-items");
  const $total = $("#cart-total");
  if (!$container.length || !$total.length) return;

  $container.empty();
  let sum = 0;

  if (cart.length === 0) {
    $container.html('<p class="text-muted">購物車是空的。</p>');
    $total.text("0");
    return;
  }

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    sum += itemTotal;

    $container.append(`
      <div class="card mb-2">
        <div class="card-body">
          <h5>${item.name}</h5>
          <p class="mb-1 text-muted">${item.desc || ""}</p>
          <p>單價 NT$${item.price} x ${item.qty} = NT$${itemTotal}</p>
          <button class="btn btn-sm btn-danger remove-item" data-index="${index}">移除</button>
        </div>
      </div>
    `);
  });

  $total.text(sum);

  $(".remove-item").on("click", function () {
    const index = $(this).data("index");
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
    updateCartCount();
  });
}
