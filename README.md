# Sistema de Registro de Asistencia Docente 🎓

Un sistema web de registro de asistencia docente y control de sesiones diseñado para el Instituto de Informática de la Universidad Nacional de Piura (UNP). 

Este proyecto moderniza el flujo de registro reemplazando Google Forms por una Web App personalizada, conectada directamente a Google Sheets como base de datos y alojada mediante un iframe en Railway.

## 🚀 Características Principales

*   **Filtros Dinámicos Inteligentes:** Los campos del formulario son dependientes. La selección del Docente y la Modalidad determina los Grupos disponibles, lo cual a su vez carga únicamente las Sesiones pendientes de dicho grupo.
*   **Base de Datos en Google Sheets:** Utiliza el ecosistema de Google Workspace para leer y escribir datos en tiempo real. Los IDs de los documentos han sido enmascarados por seguridad.
*   **Validación de Datos en Tiempo Real:** El frontend valida campos vacíos y lógica de horarios antes de enviar peticiones al servidor.
*   **Gestión Documental Automática:** Al registrar la asistencia, el sistema ubica el "libro" del docente y registra los datos en la pestaña del mes correspondiente.
*   **Interfaz Moderna y Responsiva:** Diseño minimalista tipo "Glassmorphism" adaptable a celulares y computadoras.

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
*   **Backend:** Google Apps Script (JavaScript).
*   **Base de Datos:** Google Sheets API.
*   **Despliegue (Hosting):** Google Apps Script Web App enmascarada a través de [Railway](https://railway.app/).

## 📁 Estructura del Proyecto

El repositorio está dividido en dos partes principales para facilitar el despliegue automático en Railway y el mantenimiento del código de Apps Script:

```text
├── index.html       # Archivo de enmascarado (Iframe) utilizado para el despliegue en Railway.
├── README.md        # Documentación del proyecto.
└── src/             # Código fuente implementado en Google Apps Script.
    ├── codigo.gs    # Backend (Lógica de base de datos, endpoints y reglas de negocio).
    └── index.html   # Frontend de la Web App (Estructura UI, estilos y conexión con el backend).
```

## 👨‍💻 Autor

*   **Gabriela Tahis Mauriola Valdiviezo**
*   **Organización:** Instituto de Informática - Universidad Nacional de Piura (UNP)

---
*Proyecto desarrollado en el año 2026 para la optimización de procesos académicos.*
