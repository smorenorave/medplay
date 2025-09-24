export type Usuario = { contacto: string; nombre: string | null };
export type Cuenta = {
id: number;
plataforma_id: number;
correo: string;
contrasena?: string | null;
proveedor?: string | null;
};


export type FormState = {
contacto: string;
nombre: string;
plataforma_id: number;
cuenta_id: number | null; // oculto en UI, pero se envía
nro_pantalla: string;
correo: string;
contrasena: string; // para correo nuevo o actualizar
proveedor: string;
fecha_compra: string;
fecha_vencimiento: string;
meses_pagados: number | null;
total_pagado: string;
estado: string;
comentario: string;
};