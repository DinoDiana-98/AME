// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    WHATSAPP_NUMBER: '51922511532',
    CURRENCY: 'S/ ',
    STORAGE_KEY: 'ameFiguresCart'
};

// ============================================
// ESTADO GLOBAL
//============================================
let estado = {
    carrito: [],
    productosFiltrados: [],
    categoriaActiva: 'todos',
    busquedaActiva: ''
};

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando AME Figures...');
    
    if (typeof productos === 'undefined') {
        console.error('Error: productos.js no está cargado');
        return;
    }
    
    // --- CORRECCIÓN: Convertir imágenes de string a array ---
    productos.forEach(p => {
        if (typeof p.imagenes === 'string' && p.imagenes.trim()) {
            // Dividir por comas, limpiar espacios y filtrar URLs vacías
            p.imagenes = p.imagenes.split(',').map(url => url.trim()).filter(url => url);
        } else if (!p.imagenes) {
            p.imagenes = [];
        }
    });
    
    estado.productosFiltrados = [...productos];
    cargarCarrito();
    generarCategorias();
    renderizarProductos();
    actualizarContadorCarrito();
    actualizarContadorProductos();
    actualizarCartPreview();
    
    window.addEventListener('scroll', () => {
        const scrollTop = document.getElementById('scrollTop');
        if (scrollTop) {
            scrollTop.classList.toggle('visible', window.scrollY > 300);
        }
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(filtrarPorBusqueda, 300);
        });
    }
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => ordenarProductos(e.target.value));
    }
    
    console.log('Inicialización completa. Productos cargados:', productos.length);
});

// ============================================
// GENERAR CATEGORÍAS (con scroll infinito)
// ============================================
function generarCategorias() {
    const categorias = ['todos', ...new Set(productos.map(p => p.categoria))].sort();
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Crear cada botón dos veces para lograr el efecto de scroll infinito
    categorias.forEach(cat => {
        for (let i = 0; i < 2; i++) { // Dos copias de cada categoría
            const btn = document.createElement('button');
            btn.className = `category-btn ${cat === 'todos' ? 'active' : ''}`;
            btn.setAttribute('data-category', cat);
            
            const icono = cat === 'todos' ? 'fa-star' : 'fa-tag';
            const nombre = cat === 'todos' ? 'Todos' : cat;
            
            btn.innerHTML = `<i class="fas ${icono}"></i> ${nombre}`;
            btn.onclick = () => filtrarPorCategoria(cat); // Asignamos evento directamente
            
            container.appendChild(btn);
        }
    });
}
// ============================================
// RENDERIZAR PRODUCTOS (sin número de página)
// ============================================
function renderizarProductos() {
    const grid = document.getElementById('productsGrid');
    const productsCount = document.getElementById('productsCount');
    
    if (!grid) return;
    
    if (estado.productosFiltrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: rgba(255,107,0,0.05); border-radius: 30px; border: 2px dashed rgba(255,107,0,0.3);">
                <i class="fas fa-search" style="font-size: 60px; color: var(--primary); margin-bottom: 20px;"></i>
                <h3 style="color: white; font-size: 24px; margin-bottom: 10px;">No se encontraron productos</h3>
                <p style="color: #888;">Intenta con otra búsqueda o categoría</p>
            </div>
        `;
        if (productsCount) productsCount.textContent = '0 productos';
        return;
    }
    
    grid.innerHTML = estado.productosFiltrados.map(producto => {
        // Ahora producto.imagenes es un array (gracias a la corrección)
        const imagenesArray = producto.imagenes || [];
        const primeraImagen = imagenesArray.length > 0 
            ? imagenesArray[0] 
            : 'https://via.placeholder.com/300x300/ff6b00/ffffff?text=AME+FIGURES';
        const totalImagenes = imagenesArray.length;
        
        return `
        <div class="product-card">
            <div class="product-badges">
                ${producto.esSet ? '<span class="badge set"><i class="fas fa-cubes"></i> SET</span>' : ''}
                <span class="badge discount">-${producto.descuento}%</span>
                <span class="badge stock">
                    <i class="fas fa-box"></i> ${producto.stock} uds
                </span>
            </div>
            
            <div class="product-image" onclick="verImagenes('${producto.id}')">
                <img src="${primeraImagen}" 
     loading="lazy"
     alt="${producto.nombre}"
     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x300/ff6b00/ffffff?text=AME'">
                ${totalImagenes > 1 ? '<span class="multi-image-badge"><i class="fas fa-images"></i> ' + totalImagenes + '</span>' : ''}
            </div>
            
            <div class="product-info">
                <span class="product-sku">${producto.sku}</span>
                <h3 class="product-title">${producto.nombre}</h3>
                
                <div class="product-details">
                    <span class="detail-item">
                        <i class="fas fa-ruler"></i> ${producto.tamaño}
                    </span>
                </div>
                
                <div class="price-wrapper">
                    <span class="offer-price">${CONFIG.CURRENCY}${producto.precioOferta.toFixed(2)}</span>
                    <span class="inflated-price">${CONFIG.CURRENCY}${producto.precioInflado.toFixed(2)}</span>
                    <span class="discount-tag">-${producto.descuento}%</span>
                </div>
                
                <div class="product-actions">
                    <button class="btn-add" onclick="agregarAlCarrito('${producto.id}')">
                        <i class="fas fa-cart-plus"></i> Añadir
                    </button>
                    <button class="btn-whatsapp" onclick="enviarWhatsAppProducto('${producto.id}')">
                        <i class="fab fa-whatsapp"></i> Cotizar
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
    
    if (productsCount) productsCount.textContent = `${estado.productosFiltrados.length} productos`;
}

// ============================================
// VER MÚLTIPLES IMÁGENES EN POP-UP (SweetAlert2)
// ============================================
function verImagenes(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const imagenes = producto.imagenes || [];
    if (imagenes.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin imágenes',
            text: 'Este producto no tiene imágenes disponibles.',
            background: '#1a1a1a',
            color: 'white',
            confirmButtonColor: '#ff6b00'
        });
        return;
    }
    
    let currentIndex = 0;
    
    const showImage = () => {
        const imageUrl = imagenes[currentIndex];
        const total = imagenes.length;
        
        Swal.fire({
            imageUrl: imageUrl,
            imageAlt: producto.nombre,
            title: `${producto.nombre} ${total > 1 ? `(${currentIndex + 1}/${total})` : ''}`,
            background: '#1a1a1a',
            color: 'white',
            confirmButtonColor: '#ff6b00',
            showCloseButton: true,
            showConfirmButton: false,
            showDenyButton: total > 1,
            showCancelButton: total > 1,
            denyButtonText: '<i class="fas fa-chevron-left"></i> Anterior',
            cancelButtonText: '<i class="fas fa-chevron-right"></i> Siguiente',
            cancelButtonColor: '#ff6b00',
            denyButtonColor: '#ff6b00',
            width: '90%',
            padding: '20px',
            customClass: {
                image: 'swal-image-zoom'
            }
        }).then((result) => {
            if (result.isDenied) {
                currentIndex = (currentIndex - 1 + total) % total;
                showImage();
            } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                currentIndex = (currentIndex + 1) % total;
                showImage();
            }
        });
    };
    
    showImage();
}

// ============================================
// FUNCIONES DE FILTRO
// ============================================
function filtrarPorCategoria(categoria) {
    estado.categoriaActiva = categoria;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === categoria);
    });
    aplicarFiltros();
}

function filtrarPorBusqueda() {
    estado.busquedaActiva = document.getElementById('searchInput')?.value.toLowerCase() || '';
    aplicarFiltros();
}

function ordenarProductos(tipo) {
    switch(tipo) {
        case 'menor-precio':
            estado.productosFiltrados.sort((a, b) => a.precioOferta - b.precioOferta);
            break;
        case 'mayor-precio':
            estado.productosFiltrados.sort((a, b) => b.precioOferta - a.precioOferta);
            break;
        case 'nombre':
            estado.productosFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        default:
            // Orden por defecto: por SKU (mantener el orden del array original)
            estado.productosFiltrados.sort((a, b) => a.id.localeCompare(b.id));
    }
    renderizarProductos();
}

function aplicarFiltros() {
    let filtrados = [...productos];
    
    if (estado.categoriaActiva !== 'todos') {
        filtrados = filtrados.filter(p => p.categoria === estado.categoriaActiva);
    }
    
    if (estado.busquedaActiva) {
        const busqueda = estado.busquedaActiva.toLowerCase();
        filtrados = filtrados.filter(p => 
            p.nombre.toLowerCase().includes(busqueda) ||
            p.sku.toLowerCase().includes(busqueda) ||
            p.categoria.toLowerCase().includes(busqueda) ||
            (p.palabrasClave && p.palabrasClave.toLowerCase().includes(busqueda))
        );
    }
    
    estado.productosFiltrados = filtrados;
    renderizarProductos();
    actualizarContadorProductos();
}

// ============================================
// FUNCIONES DE OFERTAS Y NOVEDADES
// ============================================
function verOfertas() {
    const ofertas = productos.filter(p => p.descuento >= 20);
    estado.productosFiltrados = ofertas;
    estado.categoriaActiva = 'ofertas';
    estado.busquedaActiva = '';
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    renderizarProductos();
    actualizarContadorProductos();
    document.querySelector('.products-section')?.scrollIntoView({ behavior: 'smooth' });
    mostrarToast(`Mostrando ${ofertas.length} productos en oferta`, 'success');
}

function verNovedades() {
    const novedades = productos.slice(0, 20);
    estado.productosFiltrados = novedades;
    estado.categoriaActiva = 'novedades';
    estado.busquedaActiva = '';
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    renderizarProductos();
    actualizarContadorProductos();
    document.querySelector('.products-section')?.scrollIntoView({ behavior: 'smooth' });
    mostrarToast(`Mostrando ${novedades.length} novedades`, 'success');
}

// ============================================
// FUNCIONES DEL CARRITO
// ============================================
function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    const itemExistente = estado.carrito.find(item => item.id === id);
    
    if (itemExistente) {
        if (itemExistente.cantidad >= producto.stock) {
            mostrarToast('¡Stock insuficiente!', 'error');
            return;
        }
        itemExistente.cantidad++;
    } else {
        estado.carrito.push({ ...producto, cantidad: 1 });
    }
    
    guardarCarrito();
    actualizarContadorCarrito();
    actualizarCarritoModal();
    actualizarCartPreview();
    mostrarToast(`${producto.nombre} añadido al carrito`, 'success');
}

function eliminarDelCarrito(id) {
    const index = estado.carrito.findIndex(item => item.id === id);
    if (index !== -1) {
        const producto = estado.carrito[index];
        estado.carrito.splice(index, 1);
        guardarCarrito();
        actualizarContadorCarrito();
        actualizarCarritoModal();
        actualizarCartPreview();
        mostrarToast(`${producto.nombre} eliminado`, 'info');
    }
}

function actualizarCantidad(id, delta) {
    const item = estado.carrito.find(item => item.id === id);
    if (!item) return;
    
    const nuevaCantidad = item.cantidad + delta;
    
    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(id);
        return;
    }
    
    if (nuevaCantidad > item.stock) {
        mostrarToast('Stock insuficiente', 'error');
        return;
    }
    
    item.cantidad = nuevaCantidad;
    guardarCarrito();
    actualizarContadorCarrito();
    actualizarCarritoModal();
    actualizarCartPreview();
}

function vaciarCarrito() {
    if (estado.carrito.length === 0) return;
    
    if (confirm('¿Vaciar carrito?')) {
        estado.carrito = [];
        guardarCarrito();
        actualizarContadorCarrito();
        actualizarCarritoModal();
        actualizarCartPreview();
        mostrarToast('Carrito vaciado', 'success');
    }
}

function calcularTotal() {
    return estado.carrito.reduce((sum, item) => sum + (item.precioOferta * item.cantidad), 0);
}

// ============================================
// FUNCIONES DE WHATSAPP
// ============================================
function enviarWhatsAppProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    
    const mensaje = `🛍️ *AME FIGURES - CONSULTA*\n\n` +
        `📦 *${producto.nombre}*\n` +
        `🔖 SKU: ${producto.sku}\n` +
        `📏 Tamaño: ${producto.tamaño}\n` +
        `💰 Precio oferta: ${CONFIG.CURRENCY}${producto.precioOferta}\n` +
        `🏷️ Descuento: ${producto.descuento}%\n\n` +
        `¿Este producto está disponible?`;
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function sendOrderWhatsApp() {
    if (estado.carrito.length === 0) {
        mostrarToast('El carrito está vacío', 'error');
        return;
    }
    
    const total = calcularTotal();
    
    let mensaje = '🛍️ *AME FIGURES - NUEVO PEDIDO* 🛍️\n\n';
    mensaje += '═══════════════════\n';
    mensaje += '*DETALLE DEL PEDIDO:*\n';
    mensaje += '═══════════════════\n\n';
    
    estado.carrito.forEach(item => {
        mensaje += `📦 *${item.nombre}*\n`;
        mensaje += `   SKU: ${item.sku}\n`;
        mensaje += `   Cantidad: ${item.cantidad}\n`;
        mensaje += `   P.Unit: ${CONFIG.CURRENCY}${item.precioOferta}\n`;
        mensaje += `   Subtotal: ${CONFIG.CURRENCY}${(item.precioOferta * item.cantidad).toFixed(2)}\n\n`;
    });
    
    mensaje += '═══════════════════\n';
    mensaje += `💰 *TOTAL: ${CONFIG.CURRENCY}${total.toFixed(2)}*\n\n`;
    mensaje += '═══════════════════\n';
    mensaje += '*DATOS DEL CLIENTE:*\n\n';
    mensaje += '👤 Nombre:\n';
    mensaje += '📞 Teléfono:\n';
    mensaje += '📍 Dirección:\n\n';
    mensaje += '✅ *¡Gracias por tu compra!*';
    
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// ============================================
// FUNCIONES DEL CARRITO MODAL
// ============================================
function toggleCart() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.toggle('active');
        document.body.style.overflow = modal.classList.contains('active') ? 'hidden' : 'auto';
        if (modal.classList.contains('active')) actualizarCarritoModal();
    }
}

function actualizarCarritoModal() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartItems) return;
    
    if (estado.carrito.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Tu carrito está vacío</h3>
                <p>¡Explora nuestro catálogo!</p>
            </div>
        `;
        if (cartTotal) cartTotal.textContent = `${CONFIG.CURRENCY}0.00`;
        return;
    }
    
    cartItems.innerHTML = estado.carrito.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-image"><i class="fas fa-box"></i></div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.nombre}</div>
                    <div class="cart-item-sku">${item.sku}</div>
                    <div class="cart-item-price">${CONFIG.CURRENCY}${item.precioOferta}</div>
                </div>
            </div>
            <div class="cart-item-quantity">
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="actualizarCantidad('${item.id}', -1)"><i class="fas fa-minus"></i></button>
                    <span>${item.cantidad}</span>
                    <button class="qty-btn" onclick="actualizarCantidad('${item.id}', 1)"><i class="fas fa-plus"></i></button>
                </div>
                <div class="item-total">${CONFIG.CURRENCY}${(item.precioOferta * item.cantidad).toFixed(2)}</div>
                <button class="qty-btn" onclick="eliminarDelCarrito('${item.id}')" style="border-color: #ff3300;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    
    if (cartTotal) cartTotal.textContent = `${CONFIG.CURRENCY}${calcularTotal().toFixed(2)}`;
}

// ============================================
// ACTUALIZAR PREVIEW DEL CARRITO
// ============================================
function actualizarCartPreview() {
    const previewItems = document.getElementById('cartPreviewItems');
    const previewTotal = document.getElementById('cartPreviewTotal');
    
    if (!previewItems || !previewTotal) return;
    
    if (estado.carrito.length === 0) {
        previewItems.innerHTML = '<div style="text-align: center; padding: 20px;">Carrito vacío</div>';
        previewTotal.textContent = `${CONFIG.CURRENCY}0.00`;
        return;
    }
    
    previewItems.innerHTML = estado.carrito.slice(-3).map(item => `
        <div class="preview-item">
            <div class="preview-item-image"><i class="fas fa-box"></i></div>
            <div class="preview-item-info">
                <div class="preview-item-title">${item.nombre.substring(0, 15)}...</div>
                <div class="preview-item-price">${CONFIG.CURRENCY}${item.precioOferta}</div>
            </div>
            <div class="preview-item-quantity">x${item.cantidad}</div>
        </div>
    `).join('');
    
    previewTotal.textContent = `${CONFIG.CURRENCY}${calcularTotal().toFixed(2)}`;
}

// ============================================
// LOCALSTORAGE
// ============================================
function guardarCarrito() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(estado.carrito));
}

function cargarCarrito() {
    const carritoGuardado = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (carritoGuardado) {
        try {
            estado.carrito = JSON.parse(carritoGuardado);
        } catch (e) {
            estado.carrito = [];
        }
    }
}

// ============================================
// ACTUALIZACIONES DE UI
// ============================================
function actualizarContadorCarrito() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = estado.carrito.reduce((sum, item) => sum + item.cantidad, 0);
}

function actualizarContadorProductos() {
    const countElem = document.getElementById('productsCount');
    if (countElem) countElem.textContent = `${estado.productosFiltrados.length} productos`;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// EXPONER FUNCIONES GLOBALMENTE
// ============================================
window.filtrarPorCategoria = filtrarPorCategoria;
window.agregarAlCarrito = agregarAlCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.actualizarCantidad = actualizarCantidad;
window.vaciarCarrito = vaciarCarrito;
window.toggleCart = toggleCart;
window.enviarWhatsAppProducto = enviarWhatsAppProducto;
window.sendOrderWhatsApp = sendOrderWhatsApp;
window.verImagenes = verImagenes;
window.verOfertas = verOfertas;
window.verNovedades = verNovedades;