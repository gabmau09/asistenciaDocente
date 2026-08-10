// 1. Cargar solo docentes activos
function obtenerDocentesActivos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaBD = ss.getSheetByName("bd grupos");
  if (!hojaBD) return [];
  
  const datos = hojaBD.getDataRange().getValues();
  let docentes = [];
  
  for (let i = 1; i < datos.length; i++) {
    // Asumiendo: Columna D (3) = Docente, Columna I (8) = Activo
    if (datos[i][8] == 1 && !docentes.includes(datos[i][3])) { 
      docentes.push(datos[i][3]);
    }
  }
  return docentes.sort();
}

// 2. Cargar grupos filtrando por Docente Y Modalidad
function obtenerDetallesDocente(docente, modalidad) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaBD = ss.getSheetByName("bd grupos");
  const datos = hojaBD.getDataRange().getValues();
  
  let grupos = [];
  
  for (let i = 1; i < datos.length; i++) {
    // Asumiendo: Columna A (0) = Grupo, Columna D (3) = Docente, Columna E (4) = Modalidad
    if (datos[i][3] === docente && datos[i][4] === modalidad && datos[i][8] == 1) {
      if (!grupos.includes(datos[i][0])) grupos.push(datos[i][0]);
    }
  }
  return grupos;
}

// 3. Cargar las sesiones pendientes (Estado 0) desde el Cronograma
function obtenerSesionesPendientes(docente, grupo, modalidad) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaCrono = ss.getSheetByName("Cronograma");
  if (!hojaCrono) return [];
  
  const datos = hojaCrono.getDataRange().getValues();
  let sesiones = [];
  
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  
  for (let i = 1; i < datos.length; i++) {
    // Busca las coincidencias donde el Estado (Columna H o índice 7) es 0
    if (datos[i][2] === docente && datos[i][0] === grupo && datos[i][6] === modalidad && datos[i][7] == 0) {
      
      let textoMostrar = datos[i][3]; 
      let fechaBD = datos[i][4]; 
      
      // Formateamos la fecha para que se vea bonita ("Sábado 16 de mayo 2026")
      if (fechaBD instanceof Date) {
        let nombreDia = dias[fechaBD.getDay()];
        let numeroDia = fechaBD.getDate();
        let nombreMes = meses[fechaBD.getMonth()];
        let anio = fechaBD.getFullYear();
        textoMostrar += ` - ${nombreDia} ${numeroDia} de ${nombreMes} ${anio}`;
      } else {
        textoMostrar += ` - ${fechaBD}`;
      }

      sesiones.push({
        // AQUÍ ESTÁ LA MAGIA: Enviamos el GRUPO (datos[i][0]) oculto para que el backend no falle
        valor: datos[i][3] + "/" + datos[i][0] + "/" + datos[i][2], 
        texto: textoMostrar 
      });
    }
  }
  return sesiones;
}

function registrarAsistenciaWeb(formData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. EXTRAER LA INFORMACIÓN DEL FORMULARIO WEB
  const grupoForm = formData.grupo; // Ejemplo: "G08-COMPUTACIÓN BÁSICA/NIMA RAMOS.../Curso"
  const sesionForm = formData.sesion; // Ejemplo: "Sesión 3/G08-COMPUTACIÓN BÁSICA/NIMA RAMOS..."
  const horaInicio = formData.horaInicio;
  const horaFin = formData.horaFin;
  const enlaceMeet = formData.enlaceMeet;

  // 2. BUSCAR INFORMACIÓN EN LA HOJA "bd grupos"
  const hojaBD = ss.getSheetByName("bd grupos");
  const datosBD = hojaBD.getDataRange().getValues();

  // Separar y limpiar espacios
  const grupoModalidadDocente = grupoForm.split("/");
  const grupo = grupoModalidadDocente[0] ? grupoModalidadDocente[0].trim() : "";
  const docente = grupoModalidadDocente[1] ? grupoModalidadDocente[1].trim() : "";
  const modalidad = grupoModalidadDocente[2] ? grupoModalidadDocente[2].trim() : "";

  // Buscar fila exacta convirtiendo todo a texto para evitar fallos
  const infoGrupo = datosBD.find(fila => 
    String(fila[0]).trim() === grupo && 
    String(fila[3]).trim() === docente && 
    String(fila[4]).trim() === modalidad
  );

  // --- ESCUDO DE SEGURIDAD 1 ---
  if (!infoGrupo) {
    throw new Error(`[ERROR BD] No se encontró el Grupo "${grupo}", Docente "${docente}", Modalidad "${modalidad}".`);
  }

  // Si lo encuentra, extrae los datos correctamente
  const [idGrupo, nombreCurso, horarioBD, nombreDocente, modBD, fInicio, fFin, horasTotales, activo, numSesion] = infoGrupo;

  const fInicioF = Utilities.formatDate(new Date(fInicio), "GMT-5", "dd/MM/yyyy");
  const fFinF = Utilities.formatDate(new Date(fFin), "GMT-5", "dd/MM/yyyy");

  // 3. OBTENER Y FORMATEAR FECHA DESDE EL CRONOGRAMA
  const fechaCruda = hallarFechaSesion(sesionForm); // Llama a la función de abajo
  const fecha = Utilities.formatDate(new Date(fechaCruda), "GMT-5", "dd/MM/yyyy");

  // Separar mes y año
  const partes = fecha.split("/");
  const dia = parseInt(partes[0]);
  const mesIndice = parseInt(partes[1]) - 1; 
  const anioNum = parseInt(partes[2]);

  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const fechaObjeto = new Date(anioNum, mesIndice, dia);
  const nombreMes = meses[fechaObjeto.getMonth()]; 
  const anio = fechaObjeto.getFullYear(); 

  // 4. REGISTRAR EN EL LIBRO DEL DOCENTE
  const nombreHojaDestino = `${nombreMes} ${anio}`;
  const idLibroDocente = obtenerLibroDocente(nombreDocente, modalidad);

  registroHoja(idLibroDocente, nombreHojaDestino, nombreCurso, nombreDocente, horarioBD, fInicioF, fFinF, modalidad, idGrupo, horasTotales, fecha, horaInicio, horaFin, enlaceMeet);  
  
  // 5. ACTUALIZAR SESIONES EN "bd grupos" (+1)
  const filaIndexBD = datosBD.findIndex(fila => 
    String(fila[0]).trim() === grupo && 
    String(fila[3]).trim() === docente && 
    String(fila[4]).trim() === modalidad
  );
  
  if (filaIndexBD !== -1) {
    const numeroFila = filaIndexBD + 1; 
    hojaBD.getRange(numeroFila, 10).setValue(numSesion + 1); // Columna J
  }

  // 6. CAMBIAR ESTADO A 1 EN "Cronograma"
  const hojaCronograma = ss.getSheetByName("Cronograma");
  const datosCronograma = hojaCronograma.getDataRange().getValues();

  const partesSesion = sesionForm.split("/");
  const sesionCrono = partesSesion[0] ? partesSesion[0].trim() : "";
  const grupoCrono = partesSesion[1] ? partesSesion[1].trim() : ""; 
  const docenteCrono = partesSesion[2] ? partesSesion[2].trim() : "";

  const infoSesion = datosCronograma.findIndex(fila => 
    String(fila[3]).trim() === sesionCrono && 
    String(fila[2]).trim() === docenteCrono && 
    String(fila[0]).trim() === grupoCrono
  );
  
  // --- ESCUDO DE SEGURIDAD 2 ---
  if (infoSesion !== -1) {
    const numFilaCrono = infoSesion + 1;
    hojaCronograma.getRange(numFilaCrono, 8).setValue(1); // Columna H (Estado)
  } else {
    throw new Error(`[ERROR CRONOGRAMA] No se pudo cambiar el estado a 1 para la sesión "${sesionCrono}".`);
  }

  return "Asistencia registrada correctamente";
}

function hallarFechaSesion(sesionForm){
  const partes = sesionForm.split("/");
  const sesion = partes[0] ? partes[0].trim() : "";
  const grupo = partes[1] ? partes[1].trim() : ""; 
  const docente = partes[2] ? partes[2].trim() : "";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaCrono = ss.getSheetByName("Cronograma");
  const datosCrono = hojaCrono.getDataRange().getValues();

  const infoGrupo = datosCrono.find(fila => 
    String(fila[3]).trim() === sesion && 
    String(fila[2]).trim() === docente && 
    String(fila[0]).trim() === grupo
  );
  
  // --- ESCUDO DE SEGURIDAD 3 ---
  if (!infoGrupo) {
    throw new Error(`[ERROR FECHA] No se encontró en Cronograma -> Sesión: "${sesion}", Grupo: "${grupo}", Docente: "${docente}".`);
  }
  
  return infoGrupo[4]; // Devuelve la fecha
}

function obtenerLibroDocente(nombreDocente, modalidad) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const hojaLibros = ss.getSheetByName("libros docentes")
  
  if (modalidad == "Curso"){
    idPlantilla = "AQUI_ID_HOJA_CALCULO_PLANTILLA_CURSO"
    idCarpetaDestino = "AQUI_ID_CARPETA_DESTINO_CURSO"
  }else if (modalidad == "Examen de Suficiencia"){ //Examen de suficiencia
    idPlantilla = "AQUI_ID_HOJA_CALCULO_PLANTILLA_EXAMEN"
    idCarpetaDestino = "AQUI_ID_CARPETA_DESTINO_EXAMEN"
  }

  const datos = hojaLibros.getDataRange().getValues()
  
  // 2. Buscar si el profesor ya tiene un libro asignado (Columna A: Nombre, Columna B: modalidad, Columna C: ID)
  const registro = datos.find(fila => fila[0] === nombreDocente && fila[1] === modalidad)
  
  if (registro) {
    return registro[2] // Retorna el ID que ya estaba guardado en la columna C
  } else {    
    const archivoPlantilla = DriveApp.getFileById(idPlantilla)
    const carpetaDestino = DriveApp.getFolderById(idCarpetaDestino);
    const nombreNuevoArchivo = nombreDocente
    
    // Hacemos la copia
    const copiaArchivo = archivoPlantilla.makeCopy(nombreNuevoArchivo)
    copiaArchivo.moveTo(carpetaDestino)
    const nuevoId = copiaArchivo.getId()
    
    hojaLibros.appendRow([nombreDocente, modalidad, nuevoId])
    
    return nuevoId;
  }
}

function registroHoja(idLibroDocente, nombreHojaDestino, nombreCurso, nombreDocente, horarioBD, fInicioF, fFinF, modalidad, idGrupo, horasTotales, fechaForm, horaInicio, horaFin, enlaceMeet){
  const libroPlan=SpreadsheetApp.openById(idLibroDocente)

  let hojaDocente = libroPlan.getSheetByName(nombreHojaDestino)

  if (!hojaDocente) {
    const plantilla = libroPlan.getSheetByName("plantilla")
    hojaDocente = plantilla.copyTo(libroPlan).setName(nombreHojaDestino)
    
    hojaDocente.getRange("A1:I30").createTextFinder("{{curso}}").replaceAllWith(nombreCurso)
    hojaDocente.getRange("A1:I30").createTextFinder("{{docente}}").replaceAllWith(nombreDocente)
    hojaDocente.getRange("A1:I30").createTextFinder("{{horario}}").replaceAllWith(horarioBD)
    hojaDocente.getRange("A1:I30").createTextFinder("{{inicio}}").replaceAllWith(fInicioF)
    hojaDocente.getRange("A1:I30").createTextFinder("{{fin}}").replaceAllWith(fFinF)
    hojaDocente.getRange("A1:I30").createTextFinder("{{modalidad}}").replaceAllWith(modalidad + " " + idGrupo)
    hojaDocente.getRange("A1:I30").createTextFinder("{{duracion}}").replaceAllWith(horasTotales + " horas")
  }

  //Registro en tabla
  const filaInicioTabla = 14
  const columnaFecha = 2 // Columna B
  
  let filaLibre = filaInicioTabla
  while (hojaDocente.getRange(filaLibre, columnaFecha).getValue() !== "" && filaLibre < 21) {
    filaLibre++;
  } 

  if (filaLibre <= 21) {
    hojaDocente.getRange(filaLibre, 2).setValue(fechaForm);      // Columna B: FECHA
    hojaDocente.getRange(filaLibre, 3).setValue(horaInicio);     // Columna C: HORA ENTRADA
    hojaDocente.getRange(filaLibre, 4).setValue(horaFin);        // Columna D: HORA SALIDA
    hojaDocente.getRange(filaLibre, 6).setValue(enlaceMeet);     // Columna F: ENLACE MEET
  }
}

function generarCronogramas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaBD = ss.getSheetByName("bd grupos");
  const datos = hojaBD.getDataRange().getValues();
  
  let hojaDestino = ss.getSheetByName("Cronograma");
  if (!hojaDestino) {
    hojaDestino = ss.insertSheet("Cronograma");
  }
  
  // Limpiamos y preparamos encabezados
  hojaDestino.clear().appendRow(["Grupo", "Curso", "Docente", "N° Sesión", "Fecha Sesión", "Horario", "Modalidad", "Estado"]);

  const resultado = [];
  const mapaDias = { 
    "DOMINGOS": 0, "LUNES": 1, "MARTES": 2, "MIERCOLES": 3, 
    "MIÉRCOLES": 3, "JUEVES": 4, "VIERNES": 5, "SABADOS": 6, "SÁBADOS": 6 
  };

  // Obtenemos la fecha de hoy para comparaciones si fuera necesario
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let i = 1; i < datos.length; i++) {
    // numSesiones es el dato de la columna J (índice 9)
    const [grupo, curso, horario, docente, modalidad, fInicio, fFin, horas, activo, numSesiones] = datos[i];

    if (activo == 1) {
      let fechaActual = new Date(fInicio);
      const fechaLimite = new Date(fFin);
      
      // El correlativo siempre inicia en 1 para mapear todo el plan de estudios
      let correlativoSesion = 1;

      if (modalidad === "Examen de Suficiencia") {
        // Estado 1 si correlativo <= asistencias registradas en BD
        let estado = (correlativoSesion <= numSesiones) ? 1 : 0;
        
        resultado.push([
          grupo, curso, docente, "Sesión " + correlativoSesion, 
          Utilities.formatDate(fechaActual, "GMT-5", "dd/MM/yyyy"), 
          horario, modalidad, estado
        ]);
      } 
      else {
        let diasPermitidos = [];
        const horarioUpper = horario.toUpperCase();

        // Lógica para rangos (ej. LUNES A VIERNES)
        if (horarioUpper.includes(" A ")) {
          const partes = horarioUpper.split(" A ");
          const diaInicioNom = partes[0].split(" ").pop();
          const diaFinNom = partes[1].split(" ")[0];
          const numInicio = mapaDias[diaInicioNom];
          const numFin = mapaDias[diaFinNom];
          if (numInicio !== undefined && numFin !== undefined) {
            for (let d = numInicio; d <= numFin; d++) { diasPermitidos.push(d); }
          }
        } else {
          // Lógica para días específicos (ej. SABADOS Y DOMINGOS)
          for (let diaTexto in mapaDias) {
            if (horarioUpper.includes(diaTexto)) { diasPermitidos.push(mapaDias[diaTexto]); }
          }
        }

        // Generación de todas las sesiones del rango
        while (fechaActual <= fechaLimite) {
          if (diasPermitidos.includes(fechaActual.getDay())) {
            
            // Si quieres que el cronograma SOLO muestre sesiones hasta HOY, 
            // podrías envolver este push en un: if (fechaActual <= hoy)
            
            let estado = (correlativoSesion <= numSesiones) ? 1 : 0;

            resultado.push([
              grupo, 
              curso, 
              docente, 
              "Sesión " + correlativoSesion,
              Utilities.formatDate(fechaActual, "GMT-5", "dd/MM/yyyy"),
              horario.split(/(\d)/)[1] ? horario.substring(horario.search(/\d/)) : horario,
              modalidad,
              estado
            ]);
            correlativoSesion++;
          }
          fechaActual.setDate(fechaActual.getDate() + 1);
        }
      }
    }
  }

  // Volcado de datos a la hoja "Cronograma"
  if (resultado.length > 0) {
    hojaDestino.getRange(2, 1, resultado.length, resultado[0].length).setValues(resultado);
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Registro de Asistencia Docente')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1'); // Importante para que se vea bien en celulares
}
