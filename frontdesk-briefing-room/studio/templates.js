/*
 * MMC Studio — ready-made content: banner templates, slide templates and the
 * homepage image library. All copy is bilingual so staff rarely need to type.
 */

const BOOK = 'https://nextpatient.co/p/montgomerymedclinic/schedule';
const CALL = 'tel:3012082273';
const t = (en, es) => ({ en, es });

/* ═══ Image library (generated for MMC; files in /images/slides/) ═══ */

export const IMAGE_LIBRARY = [
    { id: 'spot-aviation', label: 'FAA & immigration', tags: 'faa pilot aviation immigration passport physical uscis civil surgeon' },
    { id: 'spot-exam-room', label: 'Urgent care room', tags: 'urgent care walk-in same day exam room clinic' },
    { id: 'spot-flu', label: 'Flu shot', tags: 'flu shot vaccine immunization season' },
    { id: 'clinic-lobby', label: 'Our lobby', tags: 'clinic lobby reception one stop all services welcome' },
    { id: 'flu-vaccine', label: 'Flu vaccine', tags: 'vaccine flu shot immunization covid' },
    { id: 'urgent-care', label: 'Clinic lobby', tags: 'urgent care clinic reception waiting walk-in welcome' },
    { id: 'exam-room', label: 'Exam room', tags: 'exam room multi-specialty ultrasound one stop services' },
    { id: 'aviation-immigration', label: 'FAA & immigration', tags: 'faa pilot aviation immigration passport physical' },
    { id: 'flu-shot', label: 'Flu shot', tags: 'vaccine flu shot immunization covid' },
    { id: 'primary-care', label: 'Primary care', tags: 'doctor stethoscope checkup physical primary' },
    { id: 'clinic', label: 'Our clinic', tags: 'clinic office reception waiting walk-in welcome' },
    { id: 'blood-pressure', label: 'Screenings', tags: 'blood pressure screening preventive heart' },
    { id: 'lab-tests', label: 'Lab tests', tags: 'lab blood test results' },
    { id: 'faa-pilot', label: 'FAA pilots', tags: 'faa pilot aviation airplane medical certificate' },
    { id: 'immigration', label: 'Immigration', tags: 'immigration uscis passport green card i-693' },
    { id: 'occupational', label: 'Workplace', tags: 'occupational employer dot workplace safety drug' },
    { id: 'school-sports', label: 'School & sports', tags: 'school sports physical kids back to school camp' },
    { id: 'physical-therapy', label: 'Physical therapy', tags: 'sports medicine physical therapy rehab injury' },
    { id: 'dermatology', label: 'Dermatology', tags: 'skin dermatology cosmetic acne' },
    { id: 'acupuncture', label: 'Acupuncture', tags: 'acupuncture chinese medicine holistic pain' },
    { id: 'nutrition', label: 'Nutrition', tags: 'nutrition wellness diet healthy food' },
    { id: 'weight-management', label: 'Weight loss', tags: 'weight loss glp-1 semaglutide fitness' }
].map((item) => Object.assign(item, {
    src: `/images/slides/${item.id}-1280.webp`,
    thumb: `/images/slides/${item.id}-360.webp`
}));

export function imageById(id) {
    return IMAGE_LIBRARY.find((item) => item.id === id) || null;
}

/* ═══ Site banner templates ═══ */

export const BANNER_TEMPLATES = [
    {
        id: 'weather-closed', name: 'Closed for weather', icon: 'cloud-snow', color: 'red',
        banner: {
            pill: t('Weather Closure', 'Cierre por Clima'),
            message: t('Due to severe weather, <b>Montgomery Medical Clinic is closed today</b>. Stay safe — we will reopen tomorrow at 8:00 AM.',
                'Debido al mal tiempo, <b>Montgomery Medical Clinic está cerrada hoy</b>. Manténgase seguro — reabriremos mañana a las 8:00 AM.'),
            ctaLabel: t('Call the Office', 'Llamar a la Oficina'), ctaUrl: CALL, showButton: true
        }
    },
    {
        id: 'delayed-opening', name: 'Delayed opening', icon: 'clock', color: 'orange',
        banner: {
            pill: t('Delayed Opening', 'Apertura Retrasada'),
            message: t('We are opening late today at <b>10:00 AM</b>. Thank you for your patience.',
                'Hoy abriremos más tarde, a las <b>10:00 AM</b>. Gracias por su paciencia.'),
            ctaLabel: t('', ''), ctaUrl: '', showButton: false
        }
    },
    {
        id: 'early-close', name: 'Closing early', icon: 'hourglass', color: 'orange',
        banner: {
            pill: t('Early Closing', 'Cierre Temprano'),
            message: t('We are closing early today at <b>3:00 PM</b>. We will reopen tomorrow at 8:00 AM.',
                'Hoy cerraremos temprano a las <b>3:00 PM</b>. Reabriremos mañana a las 8:00 AM.'),
            ctaLabel: t('Book for Tomorrow', 'Reservar para Mañana'), ctaUrl: BOOK, ctaNewTab: true, showButton: true
        }
    },
    {
        id: 'holiday-closed', name: 'Holiday closure', icon: 'party-popper', color: 'red',
        banner: {
            pill: t('Holiday Hours', 'Horario Festivo'),
            message: t('Our office is <b>closed today</b> in observance of the holiday. We will reopen on the next business day.',
                'Nuestra oficina está <b>cerrada hoy</b> por el día festivo. Reabriremos el próximo día hábil.'),
            ctaLabel: t('', ''), ctaUrl: '', showButton: false
        }
    },
    {
        id: 'phones-down', name: 'Phone lines down', icon: 'phone', color: 'yellow',
        banner: {
            pill: t('Phone Issue', 'Problema Telefónico'),
            message: t('Our phone lines are temporarily down. Please <b>text us at (301) 205-2293</b> or walk in — we are open as usual.',
                'Nuestras líneas telefónicas no funcionan temporalmente. Por favor <b>envíenos un texto al (301) 205-2293</b> o venga sin cita — estamos abiertos como siempre.'),
            ctaLabel: t('Text Us', 'Envíenos un Texto'), ctaUrl: 'sms:3012052293', showButton: true
        }
    },
    {
        id: 'high-volume', name: 'Longer wait times', icon: 'hourglass', color: 'yellow',
        banner: {
            pill: t('Heads Up', 'Aviso'),
            message: t('We are seeing a high number of walk-in patients today. Wait times may be longer than usual — book online to save your spot.',
                'Hoy estamos atendiendo a muchos pacientes sin cita. Los tiempos de espera pueden ser más largos — reserve en línea para asegurar su lugar.'),
            ctaLabel: t('Book Online', 'Reservar en Línea'), ctaUrl: BOOK, ctaNewTab: true, showButton: true
        }
    },
    {
        id: 'flu-shots', name: 'Flu shots available', icon: 'syringe', color: 'green',
        banner: {
            pill: t('Now Available', 'Ya Disponible'),
            message: t('<b>Flu shots are here!</b> Walk in any time during office hours — no appointment needed.',
                '<b>¡Ya tenemos vacunas contra la gripe!</b> Venga en cualquier momento durante nuestro horario — no necesita cita.'),
            ctaLabel: t('Book a Visit', 'Reservar una Visita'), ctaUrl: BOOK, ctaNewTab: true, showButton: true
        }
    },
    {
        id: 'open-today', name: 'Open today', icon: 'sun', color: 'green',
        banner: {
            pill: t('Open Today', 'Abierto Hoy'),
            message: t('We are <b>open today from 8:00 AM to 1:00 PM</b>. Walk-ins welcome.',
                'Estamos <b>abiertos hoy de 8:00 AM a 1:00 PM</b>. Se aceptan pacientes sin cita.'),
            ctaLabel: t('Get Directions', 'Cómo Llegar'), ctaUrl: 'https://maps.apple.com/?address=800%20S%20Frederick%20Ave,%20Suite%20110,%20Gaithersburg,%20MD%20%2020877', ctaNewTab: true, showButton: true
        }
    },
    {
        id: 'new-provider', name: 'New provider', icon: 'stethoscope', color: 'green',
        banner: {
            pill: t('Welcome', 'Bienvenida'),
            message: t('Please welcome our newest provider to the Montgomery Medical Clinic family! <b>Now accepting new patients.</b>',
                '¡Demos la bienvenida a nuestro nuevo proveedor a la familia de Montgomery Medical Clinic! <b>Aceptando nuevos pacientes.</b>'),
            ctaLabel: t('Book an Appointment', 'Reservar una Cita'), ctaUrl: BOOK, ctaNewTab: true, showButton: true
        }
    }
];

/* ═══ Scheduled-banner starters (adds dates on top of a banner template) ═══ */

export const SCHEDULE_STARTERS = [
    { id: 'holiday', name: 'Holiday closure', icon: 'party-popper', hint: 'Pick a holiday — dates fill in for you', template: 'holiday-closed', mode: 'holiday' },
    { id: 'early-close', name: 'Early closing day', icon: 'hourglass', hint: 'One day, closes early', template: 'early-close', mode: 'single' },
    { id: 'weather', name: 'Weather closure', icon: 'cloud-snow', hint: 'One day or a few days', template: 'weather-closed', mode: 'single' },
    { id: 'promo', name: 'Seasonal message', icon: 'syringe', hint: 'Runs for weeks, e.g. flu season', template: 'flu-shots', mode: 'range' },
    { id: 'weekly', name: 'Repeats every week', icon: 'repeat', hint: 'Same message on chosen weekdays', template: 'open-today', mode: 'weekly' }
];

/* ═══ Homepage slide templates ═══ */

const BLUE = '#0d47a1';
const ORANGE = '#e67e22';
const SKY = '#1976d2';
const GREEN = '#2e7d32';
const TEAL = '#00796b';
const BERRY = '#c62828';
const PURPLE = '#5e35b1';

function slide(fields) {
    return Object.assign({
        enabled: true, layout: 'classic', image: '', accent: BLUE,
        pill: t('', ''), title: t('', ''), titleAccent: t('', ''), kicker: t('', ''), subtext: t('', ''),
        ctaLabel: t('', ''), ctaUrl: '', ctaNewTab: false, credentials: []
    }, fields);
}

const img = (id) => `/images/slides/${id}-1280.webp`;

export const SLIDE_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'services', label: 'Services' },
    { id: 'seasonal', label: 'Seasonal' },
    { id: 'notices', label: 'Hours & notices' },
    { id: 'trust', label: 'Why choose us' }
];

export const SLIDE_TEMPLATES = [
    {
        id: 'flu-season', name: 'Flu season', category: 'seasonal',
        slide: slide({
            layout: 'photo', image: img('flu-shot'), accent: ORANGE,
            pill: t('Available Now', 'Disponible Ahora'),
            title: t('Seasonal Flu Shots Are Here', 'Las Vacunas contra la Gripe Están Aquí'),
            titleAccent: t('Flu Shots', 'Vacunas contra la Gripe'),
            subtext: t('Protect yourself and your family this season. Walk in any time during office hours — no appointment needed.', 'Protéjase usted y a su familia esta temporada. Venga en cualquier momento durante nuestro horario — no necesita cita.'),
            ctaLabel: t('Book a Flu Shot', 'Reservar Vacuna'), ctaUrl: BOOK, ctaNewTab: true
        })
    },
    {
        id: 'walk-ins', name: 'Walk-ins welcome', category: 'services',
        slide: slide({
            layout: 'feature', image: img('clinic'), accent: SKY,
            pill: t('No Appointment Needed', 'Sin Cita Previa'),
            title: t('Same-Day Urgent Care', 'Atención Urgente el Mismo Día'),
            titleAccent: t('Urgent Care', 'Atención Urgente'),
            subtext: t('Feeling sick or hurt? Walk in today and be seen by a board-certified provider.', '¿Se siente enfermo o lastimado? Venga hoy y sea atendido por un proveedor certificado.'),
            ctaLabel: t('Save Your Spot', 'Reserve su Lugar'), ctaUrl: BOOK, ctaNewTab: true
        })
    },
    {
        id: 'primary-care', name: 'Primary care', category: 'services',
        slide: slide({
            layout: 'photo', image: img('primary-care'), accent: BLUE,
            pill: t('Primary Care', 'Atención Primaria'),
            title: t('A Doctor Who Knows You', 'Un Médico Que lo Conoce'),
            titleAccent: t('Knows You', 'lo Conoce'),
            subtext: t('Annual physicals, chronic care and preventive screenings for the whole family.', 'Exámenes anuales, atención de enfermedades crónicas y chequeos preventivos para toda la familia.'),
            ctaLabel: t('Become a Patient', 'Hágase Paciente'), ctaUrl: BOOK, ctaNewTab: true
        })
    },
    {
        id: 'faa', name: 'FAA pilot exams', category: 'services',
        slide: slide({
            layout: 'feature', image: img('faa-pilot'), accent: SKY,
            pill: t('For Pilots', 'Para Pilotos'),
            title: t('FAA Medical Exams, Done Right', 'Exámenes Médicos FAA, Bien Hechos'),
            titleAccent: t('Done Right', 'Bien Hechos'),
            subtext: t('First, second and third class certificates with an experienced Aviation Medical Examiner.', 'Certificados de primera, segunda y tercera clase con un Examinador Médico de Aviación experimentado.'),
            ctaLabel: t('Pilot Resources', 'Recursos para Pilotos'), ctaUrl: '/faa-physicals/pilot-resources/'
        })
    },
    {
        id: 'immigration', name: 'Immigration exams', category: 'services',
        slide: slide({
            layout: 'photo', image: img('immigration'), accent: BLUE,
            pill: t('USCIS Civil Surgeon', 'Cirujano Civil de USCIS'),
            title: t('Immigration Medical Exams (I-693)', 'Exámenes Médicos de Inmigración (I-693)'),
            titleAccent: t('Immigration', 'Inmigración'),
            subtext: t('Fast, accurate exams and sealed paperwork for your green card application.', 'Exámenes rápidos y precisos con documentos sellados para su solicitud de residencia.'),
            ctaLabel: t('Learn More', 'Más Información'), ctaUrl: '/immigration-physicals/'
        })
    },
    {
        id: 'physicals-credentials', name: 'Specialized physicals', category: 'trust',
        slide: slide({
            layout: 'classic', accent: BLUE,
            pill: t('Specialized Services', 'Servicios Especializados'),
            title: t('FAA & Immigration Physicals', 'Exámenes Físicos de FAA e Inmigración'),
            titleAccent: t('Physicals', 'FAA e Inmigración'),
            credentials: [
                t('Authorized Aviation Medical Examiner', 'Examinador Médico de Aviación Autorizado'),
                t('USCIS-Authorized Civil Surgeon', 'Cirujano Civil Autorizado por USCIS')
            ]
        })
    },
    {
        id: 'occupational', name: 'Employer services', category: 'services',
        slide: slide({
            layout: 'photo', image: img('occupational'), accent: TEAL,
            pill: t('For Employers', 'Para Empleadores'),
            title: t('Occupational Health for Your Team', 'Salud Ocupacional para su Equipo'),
            titleAccent: t('Your Team', 'su Equipo'),
            subtext: t('DOT physicals, pre-employment exams, drug screening and workplace injury care.', 'Exámenes DOT, exámenes previos al empleo, pruebas de drogas y atención de lesiones laborales.'),
            ctaLabel: t('Partner With Us', 'Trabaje con Nosotros'), ctaUrl: '/occupational-health/'
        })
    },
    {
        id: 'school-sports', name: 'Sports physicals', category: 'seasonal',
        slide: slide({
            layout: 'photo', image: img('school-sports'), accent: ORANGE,
            pill: t('Season Starting Soon', 'La Temporada Comienza Pronto'),
            title: t('Sports Physicals Made Easy', 'Exámenes Deportivos Sin Complicaciones'),
            titleAccent: t('Sports Physicals', 'Exámenes Deportivos'),
            subtext: t('Get cleared to play before the season starts. Bring your forms and we will take care of the rest.', 'Obtenga su autorización para jugar antes de que empiece la temporada. Traiga sus formularios y nosotros nos encargamos del resto.'),
            ctaLabel: t('Book a Physical', 'Reservar Examen'), ctaUrl: BOOK, ctaNewTab: true
        })
    },
    {
        id: 'sports-medicine', name: 'Sports medicine & PT', category: 'services',
        slide: slide({
            layout: 'feature', image: img('physical-therapy'), accent: ORANGE,
            pill: t('Sports Medicine', 'Medicina Deportiva'),
            title: t('Back in the Game, Stronger', 'De Vuelta al Juego, Más Fuerte'),
            titleAccent: t('Stronger', 'Más Fuerte'),
            subtext: t('Injury care, rehabilitation and physical therapy tailored to you.', 'Atención de lesiones, rehabilitación y fisioterapia a su medida.'),
            ctaLabel: t('Explore Sports Medicine', 'Ver Medicina Deportiva'), ctaUrl: 'https://montgomerysportsmedicine.com/', ctaNewTab: true
        })
    },
    {
        id: 'dermatology', name: 'Dermatology', category: 'services',
        slide: slide({
            layout: 'photo', image: img('dermatology'), accent: PURPLE,
            pill: t('Dermatology', 'Dermatología'),
            title: t('Healthy Skin Starts Here', 'La Piel Sana Comienza Aquí'),
            titleAccent: t('Healthy Skin', 'Piel Sana'),
            subtext: t('Skin checks, acne, eczema and cosmetic treatments from experienced providers.', 'Revisiones de la piel, acné, eccema y tratamientos cosméticos con proveedores experimentados.'),
            ctaLabel: t('Explore Dermatology', 'Ver Dermatología'), ctaUrl: '/dermatology/'
        })
    },
    {
        id: 'acupuncture', name: 'Acupuncture', category: 'services',
        slide: slide({
            layout: 'photo', image: img('acupuncture'), accent: GREEN,
            pill: t('Five Elements Acupuncture', 'Acupuntura Cinco Elementos'),
            title: t('Natural Relief for Pain & Stress', 'Alivio Natural para el Dolor y el Estrés'),
            titleAccent: t('Natural Relief', 'Alivio Natural'),
            subtext: t('Traditional Chinese medicine and acupuncture for holistic healing.', 'Medicina tradicional china y acupuntura para una sanación integral.'),
            ctaLabel: t('Learn About Acupuncture', 'Conozca la Acupuntura'), ctaUrl: '/five-elements-acupuncture/'
        })
    },
    {
        id: 'nutrition', name: 'Nutrition & wellness', category: 'services',
        slide: slide({
            layout: 'photo', image: img('nutrition'), accent: GREEN,
            pill: t('Wellness Center', 'Centro de Bienestar'),
            title: t('Eat Well, Feel Better', 'Coma Bien, Siéntase Mejor'),
            titleAccent: t('Feel Better', 'Siéntase Mejor'),
            subtext: t('Personalized nutrition coaching and personal training to reach your goals.', 'Asesoría nutricional personalizada y entrenamiento personal para alcanzar sus metas.'),
            ctaLabel: t('Visit the Wellness Center', 'Visite el Centro de Bienestar'), ctaUrl: '/nutrition-wellness/'
        })
    },
    {
        id: 'weight', name: 'Medical weight loss', category: 'services',
        slide: slide({
            layout: 'feature', image: img('weight-management'), accent: GREEN,
            pill: t('Medical Weight Management', 'Control Médico del Peso'),
            title: t('Lose Weight With Medical Support', 'Baje de Peso con Apoyo Médico'),
            titleAccent: t('Medical Support', 'Apoyo Médico'),
            subtext: t('Doctor-guided programs, including GLP-1 options, tailored to your health.', 'Programas guiados por médicos, incluidas opciones GLP-1, adaptados a su salud.'),
            ctaLabel: t('Start Your Plan', 'Comience su Plan'), ctaUrl: '/nutrition-wellness/'
        })
    },
    {
        id: 'screenings', name: 'Preventive screenings', category: 'seasonal',
        slide: slide({
            layout: 'photo', image: img('blood-pressure'), accent: BERRY,
            pill: t('Heart Health', 'Salud del Corazón'),
            title: t('Know Your Numbers', 'Conozca sus Números'),
            titleAccent: t('Your Numbers', 'sus Números'),
            subtext: t('Blood pressure, cholesterol and diabetes screenings — quick, simple and covered by most plans.', 'Pruebas de presión arterial, colesterol y diabetes — rápidas, sencillas y cubiertas por la mayoría de los planes.'),
            ctaLabel: t('Schedule a Screening', 'Programar una Prueba'), ctaUrl: BOOK, ctaNewTab: true
        })
    },
    {
        id: 'lab', name: 'On-site lab', category: 'services',
        slide: slide({
            layout: 'photo', image: img('lab-tests'), accent: SKY,
            pill: t('On-Site Lab', 'Laboratorio en el Lugar'),
            title: t('Lab Work Without the Extra Trip', 'Análisis sin Viajes Adicionales'),
            titleAccent: t('Without the Extra Trip', 'sin Viajes Adicionales'),
            subtext: t('Blood work and tests done right here, with results shared through your patient portal.', 'Análisis de sangre y pruebas aquí mismo, con resultados en su portal del paciente.'),
            ctaLabel: t('Open Patient Portal', 'Abrir Portal del Paciente'), ctaUrl: 'https://15259-6.portal.athenahealth.com', ctaNewTab: true
        })
    },
    {
        id: 'weekend-open', name: 'Open this weekend', category: 'notices',
        slide: slide({
            layout: 'bold', accent: BLUE,
            pill: t('Weekend Hours', 'Horario de Fin de Semana'),
            title: t('Open This Saturday, 8 AM – 1 PM', 'Abierto Este Sábado, 8 AM – 1 PM'),
            titleAccent: t('8 AM – 1 PM', '8 AM – 1 PM'),
            subtext: t('Walk-ins welcome for urgent care, physicals and flu shots.', 'Se aceptan pacientes sin cita para atención urgente, exámenes físicos y vacunas.'),
            ctaLabel: t('Get Directions', 'Cómo Llegar'), ctaUrl: 'https://maps.apple.com/?address=800%20S%20Frederick%20Ave,%20Suite%20110,%20Gaithersburg,%20MD%20%2020877', ctaNewTab: true
        })
    },
    {
        id: 'holiday-hours', name: 'Holiday hours', category: 'notices',
        slide: slide({
            layout: 'bold', accent: BERRY,
            pill: t('Holiday Hours', 'Horario Festivo'),
            title: t('Happy Holidays From Our Team', 'Felices Fiestas de Parte de Nuestro Equipo'),
            titleAccent: t('Happy Holidays', 'Felices Fiestas'),
            subtext: t('Our hours may change around the holidays. Check the banner at the top of the page or call us before you visit.', 'Nuestro horario puede cambiar durante los días festivos. Revise el aviso en la parte superior de la página o llámenos antes de venir.'),
            ctaLabel: t('Call the Office', 'Llamar a la Oficina'), ctaUrl: CALL
        })
    },
    {
        id: 'new-provider', name: 'New provider', category: 'notices',
        slide: slide({
            layout: 'classic', accent: TEAL,
            pill: t('Welcome', 'Bienvenida'),
            title: t('Meet Our Newest Provider', 'Conozca a Nuestro Nuevo Proveedor'),
            titleAccent: t('Newest Provider', 'Nuevo Proveedor'),
            subtext: t('Now accepting new patients for primary and urgent care.', 'Aceptando nuevos pacientes para atención primaria y urgente.'),
            ctaLabel: t('Meet the Team', 'Conozca al Equipo'), ctaUrl: '/about/'
        })
    },
    {
        id: 'insurance', name: 'Insurance accepted', category: 'trust',
        slide: slide({
            layout: 'classic', accent: BLUE,
            pill: t('Insurance', 'Seguros'),
            title: t('Most Major Insurance Plans Accepted', 'Aceptamos la Mayoría de los Seguros'),
            titleAccent: t('Insurance Plans', 'Seguros'),
            credentials: [
                t('Medicare & Medicaid', 'Medicare y Medicaid'),
                t('Most commercial plans', 'La mayoría de los planes comerciales'),
                t('Affordable self-pay options', 'Opciones accesibles sin seguro')
            ],
            ctaLabel: t('Check Your Coverage', 'Verifique su Cobertura'), ctaUrl: '/insurance/'
        })
    },
    {
        id: 'one-stop', name: 'Everything in one place', category: 'trust',
        slide: slide({
            layout: 'bold', accent: BLUE,
            title: t('One Stop For All Your Medical Needs', 'Todo en Un Solo Lugar Para Sus Necesidades Médicas'),
            titleAccent: t('One Stop', 'Todo en Un Solo Lugar'),
            subtext: t('Comprehensive multi-specialty care with expert doctors under one roof.', 'Atención integral multiespecialidad con médicos expertos bajo un mismo techo.'),
            ctaLabel: t('Explore Our Services', 'Explorar Nuestros Servicios'), ctaUrl: '#services'
        })
    },
    {
        id: 'text-us', name: 'Text the office', category: 'trust',
        slide: slide({
            layout: 'classic', accent: ORANGE,
            pill: t('Quick Questions?', '¿Preguntas Rápidas?'),
            title: t('Text Us at (301) 205-2293', 'Envíenos un Texto al (301) 205-2293'),
            titleAccent: t('(301) 205-2293', '(301) 205-2293'),
            subtext: t('Ask about hours, appointments or forms — our care team replies during office hours.', 'Pregunte sobre horarios, citas o formularios — nuestro equipo responde durante el horario de oficina.'),
            ctaLabel: t('Send a Text', 'Enviar un Texto'), ctaUrl: 'sms:3012052293'
        })
    },
    {
        id: 'portal', name: 'Patient portal', category: 'trust',
        slide: slide({
            layout: 'classic', accent: SKY,
            pill: t('Patient Portal', 'Portal del Paciente'),
            title: t('Your Health Records, Anytime', 'Su Historial Médico, en Cualquier Momento'),
            titleAccent: t('Anytime', 'en Cualquier Momento'),
            credentials: [t('View lab results', 'Vea sus resultados'), t('Message your provider', 'Escriba a su proveedor'), t('Request refills', 'Solicite recetas')],
            ctaLabel: t('Open the Portal', 'Abrir el Portal'), ctaUrl: 'https://15259-6.portal.athenahealth.com', ctaNewTab: true
        })
    },
    {
        id: 'announcement', name: 'Simple announcement', category: 'notices',
        slide: slide({
            layout: 'classic', accent: BLUE,
            pill: t('Announcement', 'Anuncio'),
            title: t('Your Headline Goes Here', 'Su Título Va Aquí'),
            titleAccent: t('Headline', 'Título'),
            subtext: t('Add one or two short sentences explaining the update.', 'Agregue una o dos frases cortas explicando la novedad.'),
            ctaLabel: t('Learn More', 'Más Información'), ctaUrl: '#services'
        })
    }
];

export function blankSlide() {
    return slide({
        pill: t('New Update', 'Nueva Actualización'),
        title: t('Your Headline Goes Here', 'Su Título Va Aquí'),
        titleAccent: t('Headline', 'Título')
    });
}

export const LAYOUT_OPTIONS = [
    { id: 'spotlight', label: 'Spotlight', hint: 'Copy beside a framed photo' },
    { id: 'light', label: 'Light photo', hint: 'Photo fading to white' },
    { id: 'classic', label: 'Classic', hint: 'Clean white card' },
    { id: 'photo', label: 'Photo', hint: 'Text beside a photo' },
    { id: 'feature', label: 'Feature', hint: 'Full photo background' },
    { id: 'bold', label: 'Bold', hint: 'Solid brand color' }
];

export const ACCENTS = [
    { label: 'Clinic blue', value: BLUE },
    { label: 'Sky blue', value: SKY },
    { label: 'Warm orange', value: ORANGE },
    { label: 'Fresh green', value: GREEN },
    { label: 'Teal', value: TEAL },
    { label: 'Berry red', value: BERRY },
    { label: 'Plum', value: PURPLE }
];
