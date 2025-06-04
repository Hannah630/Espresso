// ✅ jQuery 版本 cart.js

try {
  emailjs.init("YOUR_PUBLIC_KEY"); // ⬅️ 請換成你的 EmailJS 公鑰
} catch (e) {}

// 預設商品
let currentItem = {
  name: '研磨壓萃咖啡組',
  price: 9800,
  img: 'pic/product1.png',
  desc: '內容物：磨豆機+壓萃機+清潔刷'
};

$(function () {
  // 商品切換
  $('.change-item').on('click', function () {
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

// 更新購物車徽章
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
      </div>`);
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
