import type { UsuarioBolivianpetsRespuesta } from "../../../_lib/apiBolivianpets";
import estilos from "./tarjetas-kpi-clientes.module.css";

type Props = {
  totalRegistros: number;
  usuariosPagina: UsuarioBolivianpetsRespuesta[];
};

// KPIs alineados con listado solo-merchant (sin admins).
export default function TarjetasKpiClientes({ totalRegistros, usuariosPagina }: Props) {
  const activos = usuariosPagina.filter((u) => u.isActive !== false).length;
  const inactivos = usuariosPagina.length - activos;

  return (
    <section className={estilos.gridTarjetas} data-purpose="admin-clientes-kpis">
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Comercios totales</p>
        <h3 className={estilos.valorTarjeta}>{totalRegistros}</h3>
        <p className={estilos.pieTarjeta}>Cuentas merchant (sin administradores)</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Activos en esta página</p>
        <h3 className={estilos.valorTarjeta}>{activos}</h3>
        <p className={estilos.pieTarjeta}>Cuentas con acceso habilitado</p>
      </article>
      <article className={estilos.tarjeta}>
        <p className={estilos.nombreTarjeta}>Inactivos en esta página</p>
        <h3 className={estilos.valorTarjeta}>{inactivos}</h3>
        <p className={estilos.pieTarjeta}>Cuentas deshabilitadas</p>
      </article>
    </section>
  );
}
