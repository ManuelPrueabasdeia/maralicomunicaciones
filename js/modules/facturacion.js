/**
 * Módulo FACTURACIÓN - Gestión de facturas e invoices
 */

import { getFacturas, createFactura, deleteFactura, formatDate, formatMoney } from '../api.js';

export async function render(container, user) {
    let facturas = [];

    try {
        // Cargar facturas
        facturas = await getFacturas(user.uid);

        container.innerHTML = `
            <h2>📋 Facturación</h2>

            <div style="margin-bottom: 20px; display: flex; gap: 10px;">
                <button class="btn-primary" onclick="abrirFormulario()">➕ Nueva Factura</button>
                <input type="text" id="searchFactura" placeholder="Buscar..." style="flex: 1; max-width: 300px; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>

            <!-- Formulario -->
            <div id="formContainer" style="display: none; margin-bottom: 30px;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3>Nueva Factura</h3>
                    <form id="facturaForm" onsubmit="guardarFactura(event)">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                            <div class="form-group">
                                <label>RFC *</label>
                                <input type="text" id="rfc" placeholder="ABC123456XYZ" required>
                            </div>
                            <div class="form-group">
                                <label>Razón Social *</label>
                                <input type="text" id="razon_social" required>
                            </div>
                            <div class="form-group">
                                <label>Cliente *</label>
                                <input type="text" id="cliente" required>
                            </div>
                            <div class="form-group">
                                <label>Correo Electrónico</label>
                                <input type="email" id="email">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                            <div class="form-group">
                                <label>Subtotal *</label>
                                <input type="number" id="subtotal" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Impuestos</label>
                                <input type="number" id="impuestos" step="0.01" min="0" value="0">
                            </div>
                            <div class="form-group">
                                <label>Total *</label>
                                <input type="number" id="total" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Fecha Emisión *</label>
                                <input type="date" id="fecha_emision" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Descripción/Concepto</label>
                            <textarea id="descripcion" rows="4" placeholder="Detalles de la factura..."></textarea>
                        </div>

                        <div class="form-group">
                            <label>Estado</label>
                            <select id="estado">
                                <option value="emitida">Emitida</option>
                                <option value="pagada">Pagada</option>
                                <option value="cancelada">Cancelada</option>
                            </select>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button type="button" class="btn-secondary" onclick="cerrarFormulario()">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Tabla de Facturas -->
            <div style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <div id="facturasContainer" style="overflow-x: auto;">
                    <table class="table" style="margin: 0;">
                        <thead>
                            <tr>
                                <th>RFC</th>
                                <th>Cliente</th>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="facturasTableBody">
                            <tr><td colspan="6" style="text-align: center; padding: 30px;"><div class="loading"></div> Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        renderFacturas();

        // Asignar funciones globales
        window.abrirFormulario = () => {
            document.getElementById('formContainer').style.display = 'block';
            document.getElementById('facturaForm').reset();
            document.getElementById('fecha_emision').valueAsDate = new Date();
        };

        window.cerrarFormulario = () => {
            document.getElementById('formContainer').style.display = 'none';
        };

        window.guardarFactura = async (e) => {
            e.preventDefault();

            const nueva_factura = {
                rfc: document.getElementById('rfc').value,
                razon_social: document.getElementById('razon_social').value,
                cliente: document.getElementById('cliente').value,
                email: document.getElementById('email').value || null,
                subtotal: parseFloat(document.getElementById('subtotal').value),
                impuestos: parseFloat(document.getElementById('impuestos').value) || 0,
                total: parseFloat(document.getElementById('total').value),
                descripcion: document.getElementById('descripcion').value || '',
                fecha_emision: document.getElementById('fecha_emision').value,
                estado: document.getElementById('estado').value
            };

            try {
                await createFactura(nueva_factura, user.uid);
                showAlert('success', 'Factura creada');
                cerrarFormulario();
                facturas = await getFacturas(user.uid);
                renderFacturas();
            } catch (error) {
                showAlert('error', error.message);
            }
        };

        window.verDetalles = (id) => {
            const factura = facturas.find(f => f.id === id);
            if (!factura) return;

            const detallesHTML = `
                <h3>Detalles de Factura</h3>
                <div style="margin-bottom: 20px;">
                    <p><strong>RFC:</strong> ${factura.rfc}</p>
                    <p><strong>Razón Social:</strong> ${factura.razon_social}</p>
                    <p><strong>Cliente:</strong> ${factura.cliente}</p>
                    <p><strong>Email:</strong> ${factura.email || 'N/A'}</p>
                </div>
                <hr>
                <div style="margin-bottom: 20px;">
                    <p><strong>Fecha de Emisión:</strong> ${factura.fecha_emision}</p>
                    <p><strong>Estado:</strong> <span class="badge badge-${factura.estado === 'pagada' ? 'success' : factura.estado === 'cancelada' ? 'danger' : 'warning'}">${factura.estado}</span></p>
                </div>
                <hr>
                <div style="margin-bottom: 20px;">
                    <p><strong>Subtotal:</strong> $${factura.subtotal.toFixed(2)}</p>
                    <p><strong>Impuestos:</strong> $${factura.impuestos.toFixed(2)}</p>
                    <p style="font-size: 18px;"><strong>Total:</strong> $${factura.total.toFixed(2)}</p>
                </div>
                ${factura.descripcion ? `<hr><p><strong>Descripción:</strong><br>${factura.descripcion}</p>` : ''}
            `;

            alert(detallesHTML);
        };

        window.eliminarFactura = async (id) => {
            if (!confirm('¿Seguro que deseas eliminar esta factura?')) return;

            try {
                await deleteFactura(id, user.uid);
                showAlert('success', 'Factura eliminada');
                facturas = await getFacturas(user.uid);
                renderFacturas();
            } catch (error) {
                showAlert('error', error.message);
            }
        };

        // Búsqueda
        document.getElementById('searchFactura').addEventListener('keyup', (e) => {
            const search = e.target.value.toLowerCase();
            const tbody = document.getElementById('facturasTableBody');
            
            tbody.querySelectorAll('tr').forEach(tr => {
                const text = tr.textContent.toLowerCase();
                tr.style.display = text.includes(search) ? '' : 'none';
            });
        });

        function renderFacturas() {
            const tbody = document.getElementById('facturasTableBody');
            
            if (facturas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #999;">No hay facturas registradas.</td></tr>';
                return;
            }

            tbody.innerHTML = facturas.map(f => {
                const estadoBadge = f.estado === 'pagada' ? 'badge-success' : f.estado === 'cancelada' ? 'badge-danger' : 'badge-warning';
                const fecha = new Date(f.fecha_emision).toLocaleDateString('es-MX');

                return `
                    <tr>
                        <td><strong>${f.rfc}</strong></td>
                        <td>${f.cliente}</td>
                        <td>${fecha}</td>
                        <td><strong>$${f.total.toFixed(2)}</strong></td>
                        <td><span class="badge ${estadoBadge}">${f.estado}</span></td>
                        <td>
                            <button class="btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="verDetalles('${f.id}')">👁️ Ver</button>
                            <button class="btn-delete" style="padding: 6px 12px; font-size: 12px;" onclick="eliminarFactura('${f.id}')">🗑️ Eliminar</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

    } catch (error) {
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}
