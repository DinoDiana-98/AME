// ============================================
// GENERADOR DE PÁGINAS ESTÁTICAS PARA PRODUCTOS
// ============================================
// EJECUTAR CON: node js/generate-pages.js
// ============================================

const fs = require('fs');
const path = require('path');

// Configuración
const PRODUCTS_JS_PATH = './js/productos.js';
const TEMPLATE_PATH = './producto.html';
const OUTPUT_DIR = './productos/';

// Asegurar que el directorio de salida existe
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('📁 Carpeta "productos" creada');
}

// Leer el archivo de productos
console.log('📖 Leyendo archivo de productos...');
let productosContent;
try {
    productosContent = fs.readFileSync(PRODUCTS_JS_PATH, 'utf8');
} catch (error) {
    console.error('❌ Error al leer productos.js:', error.message);
    console.error('💡 Asegúrate de estar ejecutando el comando desde la carpeta raíz del proyecto');
    process.exit(1);
}

// Extraer el array de productos
const productosMatch = productosContent.match(/const productos = (\[[\s\S]*?\]);/);
if (!productosMatch) {
    console.error('❌ No se pudo encontrar el array de productos en productos.js');
    process.exit(1);
}

// Evaluar el array de productos
let productos;
try {
    productos = eval(`(${productosMatch[1]})`);
    console.log(`✅ Se encontraron ${productos.length} productos`);
} catch (error) {
    console.error('❌ Error al parsear productos.js:', error.message);
    process.exit(1);
}

// Leer la plantilla
console.log('📖 Leyendo plantilla producto.html...');
let template;
try {
    template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
} catch (error) {
    console.error('❌ Error al leer producto.html:', error.message);
    process.exit(1);
}

// Función para generar URL amigable (MEJORADA)
function generarUrlAmigable(nombre, id) {
    return nombre
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + id;
}

// Función para formatear JSON sin escapar caracteres Unicode
function formatearJSON(obj) {
    return JSON.stringify(obj, null, 2)
        .replace(/\\u[\dA-F]{4}/gi, function(match) {
            return String.fromCharCode(parseInt(match.replace('\\u', ''), 16));
        });
}

// Contador de páginas generadas
let generadas = 0;
let errores = 0;

// Generar página para cada producto
console.log('\n🔄 Generando páginas de productos...\n');

productos.forEach((producto, index) => {
    try {
        console.log(`   [${index + 1}/${productos.length}] ${producto.nombre}`);
        
        // Crear URL amigable
        const urlAmigable = generarUrlAmigable(producto.nombre, producto.id);
        const archivoSalida = path.join(OUTPUT_DIR, `${urlAmigable}.html`);
        
        // Procesar imágenes (MEJORADO)
        let imagenesArray = [];
        if (typeof producto.imagenes === 'string' && producto.imagenes.trim()) {
            imagenesArray = producto.imagenes.split(',').map(url => url.trim()).filter(url => url);
        } else if (Array.isArray(producto.imagenes)) {
            imagenesArray = producto.imagenes;
        } else {
            imagenesArray = [];
        }
        
        const primeraImagen = imagenesArray.length > 0 
            ? imagenesArray[0] 
            : 'https://via.placeholder.com/500x500/ff6b00/ffffff?text=AME+FIGURES';
        
        // Generar galería de imágenes HTML (MEJORADO)
        const galeriaHTML = imagenesArray.length > 0 
            ? imagenesArray.map((img, idx) => `
            <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="cambiarImagenPrincipal('${img}', this)">
                <img src="${img}" alt="${producto.nombre} - Vista ${idx + 1}">
            </div>`).join('')
            : `
            <div class="gallery-thumb active">
                <img src="${primeraImagen}" alt="${producto.nombre}">
            </div>`;
        
        
        
        // Determinar si tiene envío gratis
        const envioGratis = true; // Mostrar banner promocional
        
        // Variables para el stock
        const stock = parseInt(producto.stock) || 0;
        const stockPorcentaje = Math.min(100, (stock / 10) * 100);
        const stockColor = stock > 0 ? '#4caf50' : '#ff3333';
        const stockTexto = stock > 0 ? '¡En stock!' : 'Agotado';
        
        // Variables para el botón
        const botonDisabled = stock === 0 ? 'disabled' : '';
        const botonTexto = stock === 0 ? 'Agotado' : 'Añadir al carrito';
        
        // Variables para elementos condicionales
        const esSetDisplay = producto.esSet ? 'flex' : 'none';
        const envioGratisDisplay = envioGratis ? 'block' : 'none';
        
        // Descripción por defecto si no tiene
        const descripcion = producto.descripcion || `Figura coleccionable de ${producto.nombre} de ${producto.categoria}. Tamaño: ${producto.tamaño || 'Estándar'}. Envíos a todo Perú.`;
        
        // Palabras clave por defecto
        const palabrasClave = producto.palabrasClave || `${producto.categoria}, ${producto.nombre}, figura coleccionable, anime, colección, AME Figures`;
        
        // Generar datos estructurados (Schema.org) - MEJORADO
        const schemaData = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": producto.nombre,
            "image": imagenesArray.length > 0 ? imagenesArray : [primeraImagen],
            "description": descripcion.substring(0, 200),
            "sku": producto.sku,
            "mpn": producto.id,
            "brand": {
                "@type": "Brand",
                "name": "AME Figures"
            },
            "offers": {
                "@type": "Offer",
                "url": `https://dinodiana-98.github.io/AME/productos/${urlAmigable}.html`,
                "priceCurrency": "PEN",
                "price": producto.precioOferta,
                "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                "availability": stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition"
            }
        };
        
        // Generar metatags Open Graph específicas (MEJORADO)
        const ogTags = `
    <meta property="og:url" content="https://dinodiana-98.github.io/AME/productos/${urlAmigable}.html">
    <meta property="og:title" content="${producto.nombre} | AME Figures">
    <meta property="og:description" content="${descripcion.substring(0, 150)}...">
    <meta property="og:image" content="${primeraImagen}">
    <meta property="og:image:width" content="800">
    <meta property="og:image:height" content="800">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="AME Figures">
    <meta property="product:price:amount" content="${producto.precioOferta}">
    <meta property="product:price:currency" content="PEN">`;
        
        // Reemplazar variables en la plantilla (MEJORADO)
        let pageContent = template
            .replace(/{{TITULO}}/g, `${producto.nombre} | AME Figures`)
            .replace(/{{DESCRIPCION}}/g, descripcion.substring(0, 160))
            .replace(/{{PALABRAS_CLAVE}}/g, palabrasClave)
            .replace(/{{OG_TAGS}}/g, ogTags)
            .replace(/{{SCHEMA_DATA}}/g, formatearJSON(schemaData))
            .replace(/{{URL_AMIGABLE}}/g, urlAmigable)
            .replace(/{{PRODUCTO_ID}}/g, producto.id)
            .replace(/{{PRODUCTO_SKU}}/g, producto.sku)
            .replace(/{{PRODUCTO_NOMBRE}}/g, producto.nombre)
            .replace(/{{PRODUCTO_TAMAÑO}}/g, producto.tamaño || 'Estándar')
            .replace(/{{PRECIO_OFERTA}}/g, producto.precioOferta.toFixed(2))
            .replace(/{{PRECIO_INFLADO}}/g, producto.precioInflado.toFixed(2))
            .replace(/{{DESCUENTO}}/g, producto.descuento)
            .replace(/{{STOCK}}/g, stock)
            .replace(/{{STOCK_PORCENTAJE}}/g, stockPorcentaje)
            .replace(/{{STOCK_COLOR}}/g, stockColor)
            .replace(/{{STOCK_TEXTO}}/g, stockTexto)
            .replace(/{{BOTON_DISABLED}}/g, botonDisabled)
            .replace(/{{BOTON_TEXTO}}/g, botonTexto)
            .replace(/{{CATEGORIA}}/g, producto.categoria)
            .replace(/{{PRIMERA_IMAGEN}}/g, primeraImagen)
            .replace(/{{GALERIA_HTML}}/g, galeriaHTML)
            
            .replace(/{{ES_SET_DISPLAY}}/g, esSetDisplay)
            .replace(/{{ENVIO_GRATIS_DISPLAY}}/g, envioGratisDisplay)
            // Limpiar placeholders que puedan quedar
            .replace(/{{[^}]+}}/g, '');
        
        // Guardar el archivo
        fs.writeFileSync(archivoSalida, pageContent);
        generadas++;
        
    } catch (error) {
        console.error(`   ❌ Error con ${producto.nombre}:`, error.message);
        errores++;
    }
});

console.log('\n' + '='.repeat(50));
console.log(`📊 RESUMEN:`);
console.log(`   ✅ Páginas generadas: ${generadas}`);
console.log(`   ❌ Errores: ${errores}`);
console.log(`   📁 Ubicación: ${path.resolve(OUTPUT_DIR)}`);
console.log('='.repeat(50));

if (generadas > 0) {
    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('💡 Ahora puedes:');
    console.log('   1. Revisar los archivos en la carpeta "productos/"');
    console.log('   2. Verificar que las imágenes y datos sean correctos');
    console.log('   3. Hacer git add . para agregar los nuevos archivos');
    console.log('   4. Hacer commit y push a GitHub');
    
    // Mostrar ejemplo del primer producto generado
    if (productos.length > 0) {
        const primerProducto = productos[0];
        const primerUrl = generarUrlAmigable(primerProducto.nombre, primerProducto.id);
        console.log('\n📎 Ejemplo de página generada:');
        console.log(`   productos/${primerUrl}.html`);
    }
} else {
    console.log('\n❌ No se generó ninguna página. Revisa los errores.');
}