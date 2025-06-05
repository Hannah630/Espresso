// ✅ jQuery 版本 cart.js

try {
  emailjs.init("YOUR_PUBLIC_KEY"); // ⬅️ 請換成你的 EmailJS 公鑰
} catch (e) {}

// 商品圖庫資料（供輪播使用）
const productImages = [
  { src: 'pic/product1.png', alt: '研磨壓萃咖啡組' },
  { src: 'pic/product3.png', alt: '磨豆機G-works' },
  { src: 'pic/product2.png', alt: '壓萃機E-works' },
  { src: 'pic/product4.png', alt: 'PVD鍍膜粉杯' },
  { src: 'pic/product1.png', alt: '多功能清潔刷' }
];

// 預設商品
let currentItem = {
  name: '研磨壓萃咖啡組',
  price: 9800,
  img: 'pic/product1.png',
  desc: '內容物：磨豆機+壓萃機+清潔刷'
};

$(function () {
  // 切換商品 + 點小圖開啟輪播
  $('.change-item').on('click', function () {
    // 更新商品資訊
    currentItem.name = $(this).data('name');
    currentItem.price = parseInt($(this).data('price'));
    currentItem.img = $(this).data('img');
    currentItem.desc = $(this).data('desc') || '';

    $('#product-img').attr('src', currentItem.img);
    $('#product-name').text(currentItem.name);
    $('#product-price').text(currentItem.price);
    $('#product-desc').text(currentItem.desc);

    $('.change-item').removeClass('active');
    $(this).addClass('active');

    // ➤ 點小圖後直接打開輪播並跳至對應圖片
    const index = $('.change-item').index(this);
    openImageCarousel(index);
  });

  // 點主圖也開啟輪播，並自動跳至 currentItem 所在圖片
  $('#product-img').on('click', function () {
    const index = productImages.findIndex(img => img.src === currentItem.img);
    openImageCarousel(index);
  });

  // 加入購物車
  $('#add-to-cart').on('click', function () {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existing = cart.find(item => item.name === currentItem.name);

    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...currentItem, qty: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    alert(`${currentItem.name} 已加入購物車`);
  });

  // 結帳表單提交
  $('#checkout-form').on('submit', function (e) {
    e.preventDefault();
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) return alert('購物車是空的');

    const name = $('#name').val();
    const email = $('#email').val();
    const address = $('#address').val();
    const total = $('#cart-total').text();
    const items = cart.map(item => `${item.name} x${item.qty}`).join('\n');

    emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
      name, email, address, total, items
    }).then(() => {
      alert('✅ 訂單已送出！');
      localStorage.removeItem('cart');
      $('#checkout-form')[0].reset();
      loadCart();
      updateCartCount();
    }, err => alert('❌ 發送失敗：' + JSON.stringify(err)));
  });

  updateCartCount();
  loadCart();
});

// ✅ 共用函式：開啟圖片燈箱輪播
function openImageCarousel(activeIndex = 0) {
  const $carousel = $('#carousel-images');
  $carousel.empty();

  productImages.forEach((img, i) => {
    const activeClass = i === activeIndex ? 'active' : '';
    $carousel.append(`
      <div class="carousel-item ${activeClass}">
        <img src="${img.src}" class="d-block w-100" style="object-fit: contain; max-height: 80vh;" alt="${img.alt}">
      </div>
    `);
  });

  const modal = new bootstrap.Modal(document.getElementById('imageModal'));
  modal.show();
}

// 購物車徽章數量更新
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  $('#cart-count').text(count);
}

// 載入購物車內容
function loadCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const $container = $('#cart-items');
  const $total = $('#cart-total');
  if (!$container.length || !$total.length) return;

  $container.empty();
  let sum = 0;

  if (cart.length === 0) {
    $container.html('<p class="text-muted">購物車是空的。</p>');
    $total.text('0');
    return;
  }

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    sum += itemTotal;

    $container.append(`
      <div class="card mb-2">
        <div class="card-body">
          <h5>${item.name}</h5>
          <p class="mb-1 text-muted">${item.desc || ''}</p>
          <p>單價 NT$${item.price} x ${item.qty} = NT$${itemTotal}</p>
          <button class="btn btn-sm btn-danger remove-item" data-index="${index}">移除</button>
        </div>
      </div>
    `);
  });

  $total.text(sum);

  // 綁定移除按鈕
  $('.remove-item').on('click', function () {
    const index = $(this).data('index');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    updateCartCount();
  });
}
