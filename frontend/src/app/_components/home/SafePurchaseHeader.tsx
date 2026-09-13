"use client";

import estilosHome from "../../home.module.css";

// Barra superior del home BolivianPets: marca e inicio de sesión.
export default function SafePurchaseHeader({
  onSignIn,
}: Readonly<{
  onSignIn: () => void;
}>) {
  return (
    <header className={estilosHome.header}>
      <div className={estilosHome.headerInner}>
        <div className={estilosHome.marca} aria-label="BolivianPets">
          <div className={estilosHome.logoSolana}>
            <img
              className={estilosHome.logoImagen}
              src="/imagenes/logo1-solana.png"
              alt="Solana"
            />
          </div>
          <div className={estilosHome.tituloMarca}>BolivianPets</div>
        </div>

        <div className={estilosHome.headerAcciones}>
          <button
            type="button"
            className={estilosHome.botonHeader}
            onClick={onSignIn}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

