// ============================================
// GENERADOR DE PÁGINAS ESTÁTICAS PARA PRODUCTOS
// ============================================
// AUTOR: AME Figures
// DESCRIPCIÓN: Este script genera páginas HTML individuales para cada producto
//              a partir de una plantilla y los datos en productos.js
// EJECUTAR CON: node js/generate-pages.js
// ============================================

// ============================================
// IMPORTACIÓN DE MÓDULOS NECESARIOS
// ============================================
const fs = require('fs');           // Módulo para manejar archivos (File System)
const path = require('path');       // Módulo para manejar rutas de archivos

// ============================================
// CONFIGURACIÓN DEL GENERADOR
// ============================================
const PRODUCTS_JS_PATH = './js/productos.js';     // Ruta al archivo de datos de productos
const TEMPLATE_PATH = './producto.html';           // Ruta a la plantilla HTML
const OUTPUT_DIR = './productos/';                 // Carpeta donde se guardarán las páginas generadas

// ============================================
// CREAR CARPETA DE SALIDA SI NO EXISTE
// ============================================
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true }); // recursive: true crea subcarpetas si es necesario
    console.log('📁 Carpeta "productos" creada');
}

// ============================================
// LEER ARCHIVO DE PRODUCTOS
// ============================================
console.log('📖 Leyendo archivo de productos...');
let productosContent;
try {
    productosContent = fs.readFileSync(PRODUCTS_JS_PATH, 'utf8');
} catch (error) {
    console.error('❌ Error al leer productos.js:', error.message);
    console.error('💡 Asegúrate de estar ejecutando el comando desde la carpeta raíz del proyecto');
    process.exit(1); // Terminar el script con código de error
}

// ============================================
// EXTRAER EL ARRAY DE PRODUCTOS DEL ARCHIVO
// ============================================
// Busca el patrón "const productos = [...]" en el archivo
const productosMatch = productosContent.match(/const productos = (\[[\s\S]*?\]);/);
if (!productosMatch) {
    console.error('❌ No se pudo encontrar el array de productos en productos.js');
    process.exit(1);
}

// ============================================
// EVALUAR EL ARRAY DE PRODUCTOS
// ============================================
let productos;
try {
    // eval convierte el string en un array real de JavaScript
    productos = eval(`(${productosMatch[1]})`);
    console.log(`✅ Se encontraron ${productos.length} productos`);
} catch (error) {
    console.error('❌ Error al parsear productos.js:', error.message);
    process.exit(1);
}

// ============================================
// LEER LA PLANTILLA HTML
// ============================================
console.log('📖 Leyendo plantilla producto.html...');
let template;
try {
    template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
} catch (error) {
    console.error('❌ Error al leer producto.html:', error.message);
    process.exit(1);
}

// ============================================
// FUNCIÓN PARA GENERAR URL AMIGABLE (MEJORADA CON ACENTOS)
// ============================================
/**
 * Convierte el nombre del producto en una URL amigable para SEO
 * Ejemplo: "GOKU CON BÁCULO SAGRADO" -> "goku-con-baculo-sagrado-DB_FIG_032"
 * 
 * @param {string} nombre - Nombre del producto
 * @param {string|number} id - ID o SKU del producto
 * @returns {string} URL amigable
 */
function generarUrlAmigable(nombre, id) {
    return nombre
        .toLowerCase()                                // Convertir a minúsculas
        .normalize("NFD")                              // Normalizar caracteres Unicode
        .replace(/[\u0300-\u036f]/g, "")               // ELIMINAR ACENTOS (á -> a, é -> e, í -> i, ó -> o, ú -> u)
        .replace(/[ñ]/g, "n")                          // Reemplazar ñ por n específicamente
        .replace(/[ç]/g, "c")                          // Reemplazar ç por c (por si acaso)
        .replace(/[^a-z0-9\s-]/g, '')                  // Eliminar caracteres especiales
        .replace(/\s+/g, '-')                          // Reemplazar espacios por guiones
        .replace(/-+/g, '-')                            // Eliminar guiones múltiples
        .replace(/^-|-$/g, '')                          // Eliminar guiones al inicio y final
        + '-' + id;                                      // Agregar ID al final
}

// EJEMPLO DE USO CORRECTO:
// Input: "GOKU CON BÁCULO SAGRADO", "DB_FIG_032"
// Output: "goku-con-baculo-sagrado-DB_FIG_032"

// ============================================
// FUNCIÓN PARA FORMATEAR JSON SIN ESCAPAR UNICODE
// ============================================
/**
 * Convierte un objeto a JSON string sin escapar caracteres Unicode
 * Esto evita que aparezcan \uXXXX en el código HTML
 * 
 * @param {object} obj - Objeto a convertir
 * @returns {string} JSON formateado
 */
function formatearJSON(obj) {
    return JSON.stringify(obj, null, 2)
        .replace(/\\u[\dA-F]{4}/gi, function(match) {
            return String.fromCharCode(parseInt(match.replace('\\u', ''), 16));
        });
}

// ============================================
// CONTADORES PARA ESTADÍSTICAS
// ============================================
let generadas = 0;   // Contador de páginas generadas exitosamente
let errores = 0;     // Contador de errores

// ============================================
// GENERAR PÁGINA PARA CADA PRODUCTO
// ============================================
console.log('\n🔄 Generando páginas de productos...\n');

productos.forEach((producto, index) => {
    try {
        console.log(`   [${index + 1}/${productos.length}] ${producto.nombre}`);
        
        // ============================================
        // GENERAR URL AMIGABLE PARA EL PRODUCTO
        // ============================================
        const urlAmigable = generarUrlAmigable(producto.nombre, producto.id);
        const archivoSalida = path.join(OUTPUT_DIR, `${urlAmigable}.html`);
        
        // ============================================
        // PROCESAR IMÁGENES DEL PRODUCTO
        // ============================================
        let imagenesArray = [];
        if (typeof producto.imagenes === 'string' && producto.imagenes.trim()) {
            // Si es string separado por comas, dividir en array
            imagenesArray = producto.imagenes.split(',').map(url => url.trim()).filter(url => url);
        } else if (Array.isArray(producto.imagenes)) {
            // Si ya es un array, usarlo directamente
            imagenesArray = producto.imagenes;
        } else {
            // Si no hay imágenes, array vacío
            imagenesArray = [];
        }
        
        // Primera imagen para meta tags y fallback
        const primeraImagen = imagenesArray.length > 0 
            ? imagenesArray[0] 
            : 'https://via.placeholder.com/500x500/ff6b00/ffffff?text=AME+FIGURES';
        
        // ============================================
        // GENERAR HTML DE LA GALERÍA DE IMÁGENES
        // ============================================
        const galeriaHTML = imagenesArray.length > 0 
            ? imagenesArray.map((img, idx) => `
            <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="cambiarImagenPrincipal('${img}', this)">
                <img src="${img}" alt="${producto.nombre} - Vista ${idx + 1}" loading="lazy">
            </div>`).join('')
            : `
            <div class="gallery-thumb active">
                <img src="${primeraImagen}" alt="${producto.nombre}" loading="lazy">
            </div>`;
        
        // ============================================
        // CALCULAR STOCK Y PORCENTAJES
        // ============================================
        const stock = parseInt(producto.stock) || 0;                     // Stock numérico
        const stockPorcentaje = Math.min(100, (stock / 10) * 100);       // Porcentaje para barra de progreso
        const stockColor = stock > 0 ? '#4caf50' : '#ff3333';            // Color según disponibilidad
        const stockTexto = stock > 0 ? '¡En stock!' : 'Agotado';         // Texto según disponibilidad
        
        // ============================================
        // CONFIGURACIÓN DE BOTONES
        // ============================================
        const botonDisabled = stock === 0 ? 'disabled' : '';             // Deshabilitar si no hay stock
        const botonTexto = stock === 0 ? 'Agotado' : 'Añadir al carrito'; // Texto según stock
        
        // ============================================
        // ELEMENTOS CONDICIONALES
        // ============================================
        const esSetDisplay = producto.esSet ? 'flex' : 'none';           // Mostrar badge de SET
        const envioGratisDisplay = 'block';                              // Siempre mostrar banner de envío
        
        // ============================================
        // DESCRIPCIÓN Y PALABRAS CLAVE
        // ============================================
        const descripcion = producto.descripcion || `Figura coleccionable de ${producto.nombre} de ${producto.categoria}. Tamaño: ${producto.tamaño || 'Estándar'}. Envíos a todo Perú.`;
        const palabrasClave = producto.palabrasClave || `${producto.categoria}, ${producto.nombre}, figura coleccionable, anime, colección, AME Figures`;
        
        // ============================================
        // DATOS ESTRUCTURADOS (SCHEMA.ORG) PARA SEO
        // ============================================
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
        
        // ============================================
        // OPEN GRAPH TAGS PARA REDES SOCIALES
        // ============================================
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
        
        // ============================================
        // REEMPLAZAR VARIABLES EN LA PLANTILLA
        // ============================================
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
            // Limpiar cualquier placeholder que pueda haber quedado
            .replace(/{{[^}]+}}/g, '');
        
        // ============================================
        // GUARDAR EL ARCHIVO HTML GENERADO
        // ============================================
        fs.writeFileSync(archivoSalida, pageContent);
        generadas++;
        
    } catch (error) {
        console.error(`   ❌ Error con ${producto.nombre}:`, error.message);
        errores++;
    }
});

// ============================================
// MOSTRAR RESUMEN FINAL
// ============================================
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