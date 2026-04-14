// ── MMC Language Toggle ──
// Strategy: Two-pass translation.
// 1. Attribute-based: elements with data-en / data-es get innerHTML swapped (used on index.html)
// 2. Dictionary-based: a comprehensive EN→ES map applied to every text node in the page
//    so subpages get translated without needing per-element markup.
(function () {

    // ─── Comprehensive EN → ES dictionary ────────────────────────────────────────
    // Keys are exact English strings (trimmed). Values are Spanish equivalents.
    // Matching is case-insensitive; original casing of the replacement is used as-is.
    // Longer strings must come first (sorted by length desc) to avoid partial matches.
    var DICT = {

        // ── Long paragraphs – About page ──
        "When it comes to your health, you deserve exceptional care from a team you can trust. At Montgomery Medical Clinic, our experienced physicians are dedicated to keeping you and your family healthy—today and for years to come. With over five decades of combined experience, our team provides compassionate, comprehensive care tailored to your unique needs.":
            "Cuando se trata de su salud, merece atención excepcional de un equipo en el que puede confiar. En Montgomery Medical Clinic, nuestros médicos experimentados están dedicados a mantenerlo saludable a usted y a su familia, hoy y por muchos años más. Con más de cinco décadas de experiencia combinada, nuestro equipo brinda atención compasiva e integral adaptada a sus necesidades únicas.",

        "Whether you need immediate medical attention, a routine vaccination, or your yearly annual, we're here when you need us most. In addition to our outstanding primary care services, our Dermatology Department offers specialized expertise in diagnosing and treating a wide range of skin conditions. With a wealth of knowledge and experience, our dermatology specialists are committed to helping you achieve healthy, confident skin.":
            "Ya sea que necesite atención médica inmediata, una vacuna de rutina o su examen anual, estamos aquí cuando más nos necesita. Además de nuestros destacados servicios de atención primaria, nuestro Departamento de Dermatología ofrece experiencia especializada en el diagnóstico y tratamiento de una amplia gama de afecciones cutáneas. Con un gran conocimiento y experiencia, nuestros especialistas en dermatología están comprometidos a ayudarle a lograr una piel saludable y segura.",

        "By choosing one of our physicians as your primary care provider, you'll benefit from:":
            "Al elegir a uno de nuestros médicos como su proveedor de atención primaria, se beneficiará de:",

        "Our team consists of board-certified physicians and healthcare professionals with extensive experience and a shared passion for patient-centered care.":
            "Nuestro equipo está formado por médicos certificados y profesionales de la salud con amplia experiencia y una pasión compartida por la atención centrada en el paciente.",

        "At Montgomery Medical Clinic, we've designed our facility to provide you with convenient, comprehensive care. Our on-site services and experienced medical team work together to ensure you receive prompt diagnosis and treatment without the need for multiple appointments or referrals to other locations.":
            "En Montgomery Medical Clinic, hemos diseñado nuestras instalaciones para brindarle atención conveniente e integral. Nuestros servicios en el lugar y el equipo médico experimentado trabajan juntos para garantizar que reciba diagnóstico y tratamiento oportunos sin la necesidad de múltiples citas o referencias a otros lugares.",

        "We believe quality healthcare should be accessible and efficient. That's why we've integrated essential medical services right here in our clinic, allowing us to serve you better and get you on the path to wellness faster.":
            "Creemos que la atención médica de calidad debe ser accesible y eficiente. Por eso hemos integrado servicios médicos esenciales aquí mismo en nuestra clínica, lo que nos permite servirle mejor y llevarle al camino del bienestar más rápido.",

        "Join thousands of satisfied patients who trust Montgomery Medical Clinic for their healthcare needs.":
            "Únase a miles de pacientes satisfechos que confían en Montgomery Medical Clinic para sus necesidades de salud.",

        // ── Doctor bios – About page ──
        "Dr. Efi Kessous is board-certified in Family Medicine and practices primary and urgent care medicine at Montgomery Medical Clinic. He is also an Assistant Professor and faculty member at The George Washington University School of Medicine & Health Sciences. Dr. Kessous completed his medical degree and Master's in Public Health from St. Georges University School of Medicine, followed by family medicine residency at University of Maryland in Baltimore and surgical residency at Hahnemann/Drexel University Hospital in Philadelphia. His clinical interests include procedural family medicine, injuries and lacerations, women's health, and occupational and travel medicine. He is an active clinical instructor and a current member of the FAA aviation medical examiners.":
            "El Dr. Efi Kessous está certificado en Medicina Familiar y practica medicina de atención primaria y urgente en Montgomery Medical Clinic. También es Profesor Asistente y miembro del cuerpo docente de la Escuela de Medicina y Ciencias de la Salud de la Universidad George Washington. El Dr. Kessous completó su título médico y Maestría en Salud Pública en la Escuela de Medicina de la Universidad de St. Georges, seguido de una residencia en medicina familiar en la Universidad de Maryland en Baltimore y una residencia quirúrgica en el Hospital Hahnemann/Drexel University en Filadelfia. Sus intereses clínicos incluyen medicina familiar de procedimientos, lesiones y laceraciones, salud de la mujer, y medicina ocupacional y de viajes. Es un instructor clínico activo y miembro actual de los examinadores médicos de aviación de la FAA.",

        "Dr. Bertha Velandia is an experienced primary care physician who received her medical degree from the Universidad Nacional in Bogota, Colombia in 1983. She completed her residency in family medicine at the UAB Huntsville Medical Campus in 2009. During her career, Dr. Velandia has received an outstanding award in Obstetrics and Gynecology. She has also served in rural communities and published an article on scurvy still being present in developed countries. Dr. Velandia now resides in Maryland and during her spare time likes hiking, playing hide and seek with her two grandsons, and listening to folklore music.":
            "La Dra. Bertha Velandia es una médica de atención primaria experimentada que recibió su título médico de la Universidad Nacional en Bogotá, Colombia en 1983. Completó su residencia en medicina familiar en el Campus Médico UAB Huntsville en 2009. Durante su carrera, la Dra. Velandia ha recibido un premio sobresaliente en Obstetricia y Ginecología. También ha servido en comunidades rurales y publicado un artículo sobre el escorbuto que aún existe en países desarrollados. La Dra. Velandia ahora reside en Maryland y en su tiempo libre le gusta caminar, jugar al escondite con sus dos nietos y escuchar música folclórica.",

        "Dr. Eran Kessous is board certified in both family and sports medicine. He completed his sports medicine training at Harvard Medical School's Children's Hospital in Boston. Dr. Kessous received his medical degree from St. George's University in 1999, completed a surgical internship at Mount Sinai School of Medicine in New York, and after three years as a general and orthopedic surgery resident at Tel Aviv Medical Center, returned to Boston to complete a family medicine residency at Boston University Medical Center. He was an official team physician for the Major League Soccer Team DC United and is currently the medical consultant for the Kirov Academy of Ballet. He is also a clinical assistant professor at Georgetown University School of Medicine.":
            "El Dr. Eran Kessous está certificado tanto en medicina familiar como en medicina deportiva. Completó su entrenamiento en medicina deportiva en el Hospital de Niños de la Escuela de Medicina de Harvard en Boston. El Dr. Kessous recibió su título médico de la Universidad de St. George en 1999, completó una pasantía quirúrgica en la Escuela de Medicina Monte Sinai en Nueva York, y después de tres años como residente de cirugía general y ortopédica en el Centro Médico de Tel Aviv, regresó a Boston para completar una residencia en medicina familiar en el Centro Médico de la Universidad de Boston. Fue médico oficial del equipo de la Major League Soccer DC United y actualmente es el consultor médico de la Academia de Ballet Kirov. También es profesor asistente clínico en la Escuela de Medicina de la Universidad de Georgetown.",

        "Dr. Lawless is board-certified in family medicine and sports medicine. He completed his sports medicine training and family medicine training at Northwell Plainview Hospital in Plainview, NY. Dr. Lawless graduated from medical school at Lake Erie College of Osteopathic Medicine in 2012 and completed a traditional rotating internship at UPMC Mercy Hospital in Pittsburgh, PA. He was appointed a teaching associate in family medicine at Hofstra Northwell School of Medicine. His experience includes team physician for LIU Post University and medical coverage for marathons and triathlons. His skills include musculoskeletal care, diagnostic musculoskeletal ultrasound, ultrasound-guided injections, and osteopathic manipulative treatment.":
            "El Dr. Lawless está certificado en medicina familiar y medicina deportiva. Completó su entrenamiento en medicina deportiva y medicina familiar en el Hospital Northwell Plainview en Plainview, NY. El Dr. Lawless se graduó de la escuela de medicina en el Colegio de Medicina Osteopática del lago Erie en 2012 y completó una pasantía rotatoria tradicional en el Hospital UPMC Mercy en Pittsburgh, PA. Fue nombrado asociado docente en medicina familiar en la Escuela de Medicina Hofstra Northwell. Su experiencia incluye médico de equipo para la Universidad LIU Post y cobertura médica para maratones y triatlones. Sus habilidades incluyen atención musculoesquelética, ultrasonido musculoesquelético diagnóstico, inyecciones guiadas por ultrasonido y tratamiento manipulativo osteopático.",

        "Dr. Sara Brooks is a Board Certified Dermatologist and Maryland native from St. Mary's County. She attended the Honors college at University of Maryland, College Park, obtaining both a Bachelor's in Cell Biology and a Master's in Management and Organization. She went to medical school at Drexel University in Philadelphia, where she was inducted into AOA, the prestigious medical honor society. She completed a medical internship at Thomas Jefferson University and her residency in Internal Medicine and Dermatology at Georgetown University and Washington Hospital Center, where she served as Chief Resident of Dermatology. She also completed a Melanoma Fellowship at the Washington Cancer Institute. She is a Fellow of the American Academy of Dermatology.":
            "La Dra. Sara Brooks es Dermatóloga Certificada y oriunda de Maryland, del condado de St. Mary's. Asistió al Colegio de Honor de la Universidad de Maryland, College Park, obteniendo tanto una Licenciatura en Biología Celular como una Maestría en Administración y Organización. Fue a la escuela de medicina en la Universidad Drexel en Filadelfia, donde fue admitida en AOA, la prestigiosa sociedad honorífica médica. Completó una pasantía médica en la Universidad Thomas Jefferson y su residencia en Medicina Interna y Dermatología en la Universidad de Georgetown y el Centro Hospitalario de Washington, donde fue Residente Jefe de Dermatología. También completó una Beca en Melanoma en el Instituto de Cáncer de Washington. Es Miembro de la Academia Americana de Dermatología.",

        "Dr. Marsha Mitchum is a board-certified dermatologist with extensive experience in medical and oncologic dermatology. Before entering medicine, she served in the United States Air Force as a KC-135 pilot and instructor, completing assignments across Europe and the Pacific. She later transitioned to medicine, serving as a Flight Surgeon and Dermatologist at several major military medical centers. Dr. Mitchum completed her Dermatology Residency with the National Capital Consortium and a Fellowship in Cutaneous Oncology at the Dana-Farber Cancer Institute and Brigham and Women's Hospital, Harvard University. She also worked as a Medical Officer in the Division of Oncology at the U.S. Food and Drug Administration, where she contributed to national cancer drug evaluation and clinical research oversight. Her clinical interests include general medical dermatology, skin cancer diagnosis and treatment, and complex skin disorders. At Montgomery Medical Clinic Dermatology, Dr. Mitchum is dedicated to providing evidence-based, compassionate care—combining her background in medicine, oncology, and aviation to deliver precise, patient-centered treatment.":
            "La Dra. Marsha Mitchum es una dermatóloga certificada con amplia experiencia en dermatología médica y oncológica. Antes de entrar en la medicina, sirvió en la Fuerza Aérea de los Estados Unidos como piloto e instructora de KC-135, completando misiones en Europa y el Pacífico. Más tarde hizo la transición a la medicina, sirviendo como Cirujana de Vuelo y Dermatóloga en varios grandes centros médicos militares. La Dra. Mitchum completó su Residencia en Dermatología con el Consorcio de la Capital Nacional y una Beca en Oncología Cutánea en el Instituto de Cáncer Dana-Farber y el Hospital Brigham and Women's, Universidad de Harvard. También trabajó como Oficial Médica en la División de Oncología de la FDA de los EE.UU., donde contribuyó a la evaluación nacional de medicamentos contra el cáncer y la supervisión de investigación clínica. Sus intereses clínicos incluyen dermatología médica general, diagnóstico y tratamiento del cáncer de piel, y trastornos cutáneos complejos.",

        "Dr. Heon Y Jang, PT, DPT is a graduate of Medical College of Virginia Campus, Virginia Commonwealth University. Prior to attending Doctor of Physical Therapy program, he attended South Western University in the Philippines and Won kang Health science college in Korea. He served in the Korean Air Force as a medic contributing to the Air Force Military health and readiness and was discharged honorably after 30 months of service. He has had over two decades of clinical experience as a Physical Therapy Practitioner focusing on orthopedic conditions and sports injuries. His academic and clinical training includes spinal manipulation through studies at Wonkang Health Science, and Functional Dry Needling through advanced training at Kinetacore Institute for Pain Management and sports Injuries.":
            "El Dr. Heon Y Jang, PT, DPT es graduado del Campus del Colegio Médico de Virginia, Universidad de la Commonwealth de Virginia. Antes de asistir al programa de Doctor en Terapia Física, asistió a la Universidad South Western en Filipinas y al Colegio de Ciencias de la Salud Won kang en Corea. Sirvió en la Fuerza Aérea Coreana como médico contribuyendo a la salud y preparación militar de la Fuerza Aérea y fue dado de baja honorablemente después de 30 meses de servicio. Ha tenido más de dos décadas de experiencia clínica como Practicante de Terapia Física enfocado en condiciones ortopédicas y lesiones deportivas.",

        "Hodaya guides patients through realistic nutrition strategies that fit their medical plans and daily routines. She emphasizes mindful eating, weekly meal structure, and habit-building so individuals and families can sustain long-term wellness.":
            "Hodaya guía a los pacientes a través de estrategias de nutrición realistas que se ajustan a sus planes médicos y rutinas diarias. Hace hincapié en la alimentación consciente, la estructura semanal de comidas y la formación de hábitos para que las personas y las familias puedan mantener el bienestar a largo plazo.",

        "Kevin develops customized training plans that balance strength, mobility, and recovery. His coaching style blends functional movement with steady encouragement, keeping clients motivated while preventing injury and promoting confident movement.":
            "Kevin desarrolla planes de entrenamiento personalizados que equilibran la fuerza, la movilidad y la recuperación. Su estilo de entrenamiento combina el movimiento funcional con un aliento constante, manteniendo a los clientes motivados mientras previene lesiones y promueve el movimiento seguro.",

        "Dr. Min Lu is a licensed acupuncturist dedicated to providing exceptional acupuncture care tailored to your unique health needs. She integrates traditional Chinese medicine with modern biomedical knowledge to offer comprehensive holistic wellness solutions. Dr. Lu specializes in pain management, fertility treatment, stress management, and a variety of traditional Chinese medicine therapies including cupping and moxibustion. Her approach focuses on treating the whole person, addressing both symptoms and root causes to achieve optimal health and wellbeing.":
            "La Dra. Min Lu es una acupunturista licenciada dedicada a proporcionar atención de acupuntura excepcional adaptada a sus necesidades de salud únicas. Integra la medicina tradicional china con el conocimiento biomédico moderno para ofrecer soluciones integrales de bienestar holístico. La Dra. Lu se especializa en el manejo del dolor, tratamiento de fertilidad, manejo del estrés, y una variedad de terapias de medicina tradicional china incluyendo ventosas y moxibustión. Su enfoque se centra en tratar a la persona completa, abordando tanto los síntomas como las causas raíz para lograr una salud y bienestar óptimos.",

        // ── Long paragraphs – Dermatology page ──
        "At our dermatology clinic within Montgomery Medical Clinic, we offer comprehensive clinical dermatology services. Whether concerned with acne, hair loss, or chronic skin disorders, our dermatology experts use the latest medical and clinical treatment techniques for all your dermatology concerns.":
            "En nuestra clínica de dermatología dentro de Montgomery Medical Clinic, ofrecemos servicios integrales de dermatología clínica. Ya sea que le preocupe el acné, la pérdida de cabello o los trastornos crónicos de la piel, nuestros expertos en dermatología utilizan las últimas técnicas médicas y de tratamiento clínico para todas sus inquietudes dermatológicas.",

        "This year alone, thousands of people will be diagnosed with skin cancer. Early dermatology detection is essential for your skin and overall health. Our dermatology clinic provides comprehensive cosmetic and dermatology screenings.":
            "Solo este año, miles de personas serán diagnosticadas con cáncer de piel. La detección temprana de dermatología es esencial para su piel y salud general. Nuestra clínica de dermatología proporciona exámenes cosméticos y de dermatología integrales.",

        "Our highly experienced dermatology specialists at our dermatology clinic have extensive expertise in detecting and treating skin cancers through advanced cosmetic and dermatology procedures before they spread.":
            "Nuestros especialistas en dermatología con amplia experiencia en nuestra clínica de dermatología tienen extensa experiencia en la detección y tratamiento de cánceres de piel a través de procedimientos cosméticos y de dermatología avanzados antes de que se propaguen.",

        "Expert clinical dermatology care from experienced, board-certified professionals at our dermatology clinic.":
            "Atención de dermatología clínica experta de profesionales experimentados y certificados en nuestra clínica de dermatología.",

        "From medical dermatology treatments to aesthetic procedures, our dermatology clinic offers complete skin care solutions":
            "Desde tratamientos de dermatología médica hasta procedimientos estéticos, nuestra clínica de dermatología ofrece soluciones completas de cuidado de la piel",

        "Expert dermatology diagnosis and medical treatment for a wide range of skin conditions":
            "Diagnóstico de dermatología experto y tratamiento médico para una amplia gama de condiciones de la piel",

        "Dr. Sara Brooks is a board-certified dermatologist and Maryland native from St. Mary's County. She attended the Honors College at University of Maryland, College Park, where she obtained both a Bachelor's degree in Cell Biology and a Master's degree in Management and Organization.":
            "La Dra. Sara Brooks es una dermatóloga certificada oriunda de Maryland, del condado de St. Mary's. Asistió al Colegio de Honor de la Universidad de Maryland, College Park, donde obtuvo una Licenciatura en Biología Celular y una Maestría en Administración y Organización.",

        "She completed medical school at Drexel University in Philadelphia, PA, where she was inducted into AOA, the prestigious medical honor society. After graduation, she performed a medical internship at Thomas Jefferson University.":
            "Completó la escuela de medicina en la Universidad Drexel en Filadelfia, PA, donde fue admitida en AOA, la prestigiosa sociedad honorífica médica. Después de graduarse, realizó una pasantía médica en la Universidad Thomas Jefferson.",

        "Dr. Brooks returned to the DC area as a resident in both Internal Medicine and Dermatology at Georgetown University and Washington Hospital Center, where she served as Chief Resident of Dermatology. She also completed a Melanoma Fellowship at the Washington Cancer Institute.":
            "La Dra. Brooks regresó al área de DC como residente en Medicina Interna y Dermatología en la Universidad de Georgetown y el Centro Hospitalario de Washington, donde fue Residente Jefe de Dermatología. También completó una Beca en Melanoma en el Instituto de Cáncer de Washington.",

        "She is a Fellow of the American Academy of Dermatology and a member of the American College of Physicians, American Medical Association, and American Society of Dermatologic Surgeons. Dr. Brooks is dedicated to providing comprehensive dermatological care with a focus on both medical and cosmetic treatments.":
            "Es Miembro de la Academia Americana de Dermatología y miembro del Colegio Americano de Médicos, la Asociación Médica Americana y la Sociedad Americana de Cirujanos Dermatológicos. La Dra. Brooks está dedicada a proporcionar atención dermatológica integral con enfoque en tratamientos médicos y cosméticos.",

        "Dr. Marsha Mitchum is a board-certified dermatologist with extensive experience in medical and oncologic dermatology. Before entering medicine, she served in the United States Air Force as a KC-135 pilot and instructor, completing assignments across Europe and the Pacific. She later transitioned to medicine, serving as a Flight Surgeon and Dermatologist at several major military medical centers.":
            "La Dra. Marsha Mitchum es una dermatóloga certificada con amplia experiencia en dermatología médica y oncológica. Antes de entrar en la medicina, sirvió en la Fuerza Aérea de los Estados Unidos como piloto e instructora de KC-135, completando misiones en Europa y el Pacífico. Más tarde hizo la transición a la medicina, sirviendo como Cirujana de Vuelo y Dermatóloga en varios grandes centros médicos militares.",

        // ── Urgent & Primary Care page ──
        "Our urgent care center and primary care providers deliver comprehensive medical services. Visit our urgent center for immediate care or see our primary doctors for ongoing health management.":
            "Nuestro centro de atención urgente y proveedores de atención primaria ofrecen servicios médicos integrales. Visite nuestro centro urgente para atención inmediata o consulte a nuestros médicos de atención primaria para el manejo continuo de su salud.",

        "Having a primary care provider who understands your medical history is essential to your overall health. Our primary care physicians and primary doctors provide comprehensive preventative care at our urgent care center, ensuring your health needs are met promptly.":
            "Tener un proveedor de atención primaria que comprenda su historial médico es esencial para su salud en general. Nuestros médicos de atención primaria y médicos de cabecera brindan atención preventiva integral en nuestro centro de atención urgente, asegurando que sus necesidades de salud se atiendan de manera oportuna.",

        "At our urgent center and medical clinic, we strive to be your trusted primary care provider with seamless, patient-centered urgent care services. Our primary care physicians are committed to compassionate care for you and your family, whether you need immediate attention at our urgent care center or ongoing support from your primary doctor.":
            "En nuestro centro urgente y clínica médica, nos esforzamos por ser su proveedor de atención primaria de confianza con servicios de atención urgente sin interrupciones y centrados en el paciente. Nuestros médicos de atención primaria están comprometidos con la atención compasiva para usted y su familia, ya sea que necesite atención inmediata en nuestro centro de atención urgente o apoyo continuo de su médico de cabecera.",

        "Your whole family needs a primary care provider for optimal health. Our primary care physicians at the urgent center offer routine physicals and preventative care. Research shows that adults who visit their primary doctor regularly manage chronic conditions better, maintain lower healthcare costs, and experience greater satisfaction with their primary care provider.":
            "Toda su familia necesita un proveedor de atención primaria para una salud óptima. Nuestros médicos de atención primaria en el centro urgente ofrecen exámenes físicos de rutina y atención preventiva. Las investigaciones muestran que los adultos que visitan a su médico de cabecera regularmente manejan mejor las condiciones crónicas, mantienen costos de atención médica más bajos y experimentan mayor satisfacción con su proveedor de atención primaria.",

        "Our urgent care center and primary care physicians are available to provide urgent care services without an appointment. Visit our urgent center with flexible hours six days a week—we're even open on most holidays! Whether you need an urgent center visit or want to establish care with primary doctors, we're here for you.":
            "Nuestro centro de atención urgente y médicos de atención primaria están disponibles para brindar servicios de atención urgente sin cita previa. Visite nuestro centro urgente con horario flexible seis días a la semana, ¡incluso abierto en la mayoría de los días festivos! Ya sea que necesite una visita al centro urgente o quiera establecer atención con médicos de atención primaria, estamos aquí para usted.",

        "Board-certified primary care providers and family medicine primary doctors at our urgent care center, dedicated to your health and wellbeing.":
            "Proveedores de atención primaria certificados y médicos de medicina familiar en nuestro centro de atención urgente, dedicados a su salud y bienestar.",

        "Dr. Efi Kessous is a board-certified primary care physician who practices at our urgent care center and serves as a trusted primary doctor at Montgomery Medical Clinic. As a primary care provider, he is also an Assistant Professor and faculty member at The George Washington University School of Medicine & Health Sciences.":
            "El Dr. Efi Kessous es un médico de atención primaria certificado que practica en nuestro centro de atención urgente y sirve como médico de cabecera de confianza en Montgomery Medical Clinic. Como proveedor de atención primaria, también es Profesor Asistente y miembro del cuerpo docente de la Escuela de Medicina y Ciencias de la Salud de la Universidad George Washington.",

        "As a primary care physician at our urgent center, his clinical interests include procedural family medicine, injury management, women's health, and occupational medicine. Dr. Kessous is committed to providing comprehensive urgent care and primary care services for individuals and families as their dedicated primary doctor.":
            "Como médico de atención primaria en nuestro centro urgente, sus intereses clínicos incluyen medicina familiar de procedimientos, manejo de lesiones, salud de la mujer y medicina ocupacional. El Dr. Kessous está comprometido a proporcionar servicios integrales de atención urgente y primaria para individuos y familias como su médico de cabecera dedicado.",

        "He is a member of the American Academy of Family Physicians and serves as a designated FAA aviation medical examiner, bringing a diverse skill set to patient care.":
            "Es miembro de la Academia Americana de Médicos de Familia y sirve como examinador médico de aviación de la FAA designado, aportando un conjunto diverso de habilidades a la atención al paciente.",

        "Dr. Bertha Velandia is an experienced primary care provider and primary doctor who received her medical degree from the Universidad Nacional in Bogota, Colombia in 1983. As a primary care physician, she completed her residency in family medicine at the UAB Huntsville Medical Campus in 2009.":
            "La Dra. Bertha Velandia es una proveedora de atención primaria y médica de cabecera experimentada que recibió su título médico de la Universidad Nacional en Bogotá, Colombia en 1983. Como médica de atención primaria, completó su residencia en medicina familiar en el Campus Médico UAB Huntsville en 2009.",

        "During her distinguished career, Dr. Velandia has received an outstanding award in Obstetrics and Gynecology. She has also dedicated time serving in rural communities and published research on scurvy in developed countries.":
            "Durante su distinguida carrera, la Dra. Velandia ha recibido un premio sobresaliente en Obstetricia y Ginecología. También ha dedicado tiempo sirviendo en comunidades rurales y publicado investigaciones sobre el escorbuto en países desarrollados.",

        "As a dedicated primary care physician at our urgent care center, Dr. Velandia brings warmth and experience as a primary doctor, making urgent care and primary care services accessible and compassionate for families in Gaithersburg.":
            "Como médica de atención primaria dedicada en nuestro centro de atención urgente, la Dra. Velandia aporta calidez y experiencia como médica de cabecera, haciendo accesibles y compasivos los servicios de atención urgente y primaria para las familias en Gaithersburg.",

        "Dr. Lawless is a dual board-certified primary care provider in family medicine and sports medicine at our urgent center. As a primary doctor, he completed his training at Northwell Plainview Hospital in Plainview, NY, and graduated from Lake Erie College of Osteopathic Medicine in 2012.":
            "El Dr. Lawless es un proveedor de atención primaria con doble certificación en medicina familiar y medicina deportiva en nuestro centro urgente. Como médico de cabecera, completó su entrenamiento en el Hospital Northwell Plainview en Plainview, NY, y se graduó del Colegio de Medicina Osteopática del lago Erie en 2012.",

        "His comprehensive training includes a traditional rotating internship at UPMC Mercy Hospital in Pittsburgh, PA. He was appointed as a teaching associate in family medicine at Hofstra Northwell School of Medicine during his sports medicine fellowship.":
            "Su entrenamiento integral incluye una pasantía rotatoria tradicional en el Hospital UPMC Mercy en Pittsburgh, PA. Fue nombrado asociado docente en medicina familiar en la Escuela de Medicina Hofstra Northwell durante su beca en medicina deportiva.",

        "As a primary care physician at our urgent care center, Dr. Lawless' expertise includes musculoskeletal care, diagnostic ultrasound, ultrasound-guided injections, and osteopathic treatment. This primary doctor provides comprehensive urgent care and primary care services for acute and chronic conditions.":
            "Como médico de atención primaria en nuestro centro de atención urgente, la experiencia del Dr. Lawless incluye atención musculoesquelética, ultrasonido diagnóstico, inyecciones guiadas por ultrasonido y tratamiento osteopático. Este médico de cabecera proporciona servicios integrales de atención urgente y primaria para condiciones agudas y crónicas.",

        "Walk in today or schedule an appointment for your convenience.":
            "Visítenos hoy sin cita o programe una cita a su conveniencia.",

        // ── Insurance page ──
        "We accept a wide variety of insurance plans to serve you better.":
            "Aceptamos una amplia variedad de planes de seguro para servirle mejor.",

        "We are pleased to accept a wide variety of insurance providers. However, please remember it is your responsibility to know your co-pay amount, deductible, co-insurance and any limits that may apply to your plan.":
            "Nos complace aceptar una amplia variedad de proveedores de seguro. Sin embargo, recuerde que es su responsabilidad conocer el monto de su copago, deducible, coseguro y cualquier límite que pueda aplicar a su plan.",

        "*Please note that you will need a referral to see a specialty provider with these plans.":
            "*Tenga en cuenta que necesitará una referencia para ver a un proveedor especializado con estos planes.",

        "This list is not exhaustive. If you have any questions please contact us at (301) 208-2273.":
            "Esta lista no es exhaustiva. Si tiene alguna pregunta, comuníquese con nosotros al (301) 208-2273.",

        "Ready to Experience the Difference?":
            "¿Listo para Experimentar la Diferencia?",

        // ── FAA Physicals page ──
        "Authorized Aviation Medical Examiner providing comprehensive FAA medical certifications.":
            "Examinador Médico de Aviación Autorizado que proporciona certificaciones médicas FAA integrales.",

        "In order to determine that you are fit to pilot an aircraft, the Federal Aviation Administration requires that pilots take an FAA physical. This physical will inspect your physical and mental health and look at your medical history.":
            "Para determinar que usted está en condiciones de pilotar una aeronave, la Administración Federal de Aviación requiere que los pilotos realicen un examen físico de la FAA. Este examen físico inspeccionará su salud física y mental y revisará su historial médico.",

        "FAA physicals must be conducted by an authorized Aviation Medical Examiner (AME). Dr. Efi Kessous is an authorized AME and has a wealth of experience performing these physicals.":
            "Los exámenes físicos de la FAA deben ser realizados por un Examinador Médico de Aviación (AME) autorizado. El Dr. Efi Kessous es un AME autorizado y tiene una gran experiencia realizando estos exámenes físicos.",

        "Dr. Efi Kessous performs all three classes of FAA physicals:":
            "El Dr. Efi Kessous realiza las tres clases de exámenes físicos de la FAA:",

        "Class - For Airline Transport Pilots": "Clase - Para Pilotos de Transporte Aéreo",
        "Class - For Commercial Pilots": "Clase - Para Pilotos Comerciales",
        "Class - For Student and Recreational Pilots": "Clase - Para Pilotos Estudiantes y Recreativos",

        "To ensure that your physical goes smoothly, you'll want to register an account on the FAA's MedXPress system and complete the appropriate electronic form. During the physical, you can expect to take a hearing test, a vision test, and an echocardiogram (for a first class physical over a certain age). You will also be asked to provide a urine sample.":
            "Para asegurarse de que su examen físico se realice sin problemas, deberá registrar una cuenta en el sistema MedXPress de la FAA y completar el formulario electrónico correspondiente. Durante el examen físico, puede esperar realizar una prueba de audición, una prueba de visión y un ecocardiograma (para un examen físico de primera clase por encima de cierta edad). También se le pedirá que proporcione una muestra de orina.",

        "We also recommend that you review the FAA's full list of minimum requirements as well as the AMAS Medication Database if you are currently taking any medication.":
            "También recomendamos que revise la lista completa de requisitos mínimos de la FAA, así como la Base de Datos de Medicamentos AMAS si actualmente está tomando algún medicamento.",

        "Depending on your age and the type of medical certificate that you have, you will need to repeat the FAA physical anywhere from every 6 months to every 60 months. Find the expiration period for your certificate.":
            "Dependiendo de su edad y el tipo de certificado médico que tenga, deberá repetir el examen físico de la FAA cada 6 meses hasta cada 60 meses. Encuentre el período de vencimiento para su certificado.",

        "Montgomery Medical Clinic is proud to serve pilots in the DMV area. Located near some of the best flight schools in the county, such as Pilot In Training Flight School & Washington International Flight Academy.":
            "Montgomery Medical Clinic se enorgullece de servir a los pilotos en el área DMV. Ubicado cerca de algunas de las mejores escuelas de vuelo del condado, como Pilot In Training Flight School y Washington International Flight Academy.",

        "Contact us to book your aviation medical examination.":
            "Contáctenos para reservar su examen médico de aviación.",

        // ── Immigration Physicals page ──
        "USCIS-authorized civil surgeon providing comprehensive immigration medical examinations for green card applicants.":
            "Cirujano civil autorizado por USCIS que proporciona exámenes médicos de inmigración integrales para solicitantes de tarjeta verde.",

        "Individuals applying for a green card (lawful permanent residence) must undergo a physical examination by a licensed medical professional who has been authorized by the United States Citizenship and Immigration Service (USCIS). The purpose of this physical is to check green card applicants for pre-existing conditions that would preclude their applications from being approved.":
            "Las personas que solicitan una tarjeta verde (residencia permanente legal) deben someterse a un examen físico por un profesional médico licenciado que haya sido autorizado por el Servicio de Ciudadanía e Inmigración de los Estados Unidos (USCIS). El propósito de este examen físico es verificar a los solicitantes de tarjeta verde en busca de condiciones preexistentes que impidan que sus solicitudes sean aprobadas.",

        "During the physical, the physician will check for communicable diseases and provide any required vaccinations that have not yet been received.":
            "Durante el examen físico, el médico verificará enfermedades transmisibles y proporcionará las vacunas requeridas que aún no se hayan recibido.",

        "Dr. Kessous is a USCIS-designated civil surgeon with extensive experience conducting immigration medical examinations.":
            "El Dr. Kessous es un cirujano civil designado por USCIS con amplia experiencia realizando exámenes médicos de inmigración.",

        "If you are unsure of the current vaccination requirements, you can review the CDC's comprehensive vaccination requirements for civil surgeons.":
            "Si no está seguro de los requisitos actuales de vacunación, puede revisar los requisitos integrales de vacunación del CDC para cirujanos civiles.",

        "A government issued ID, such as a driving license or passport":
            "Una identificación emitida por el gobierno, como una licencia de conducir o pasaporte",

        "A copy of your immunization records":
            "Una copia de sus registros de vacunación",

        "If all the test results come back normal, you can typically expect a call within 1-2 weeks to let you know that the paperwork is ready to collect.":
            "Si todos los resultados de las pruebas regresan normales, puede esperar típicamente una llamada dentro de 1-2 semanas para informarle que el papeleo está listo para recoger.",

        "Contact us to book your USCIS immigration medical examination.":
            "Contáctenos para reservar su examen médico de inmigración USCIS.",

        // ── Occupational Health page ──
        "i693 USCIS Medical Exam • Immigration Physicals • Corporate Wellness Programs":
            "Examen Médico i693 USCIS • Exámenes Físicos de Inmigración • Programas de Bienestar Corporativo",

        "Complete immigration physical examinations and i693 form processing for green card applications.":
            "Exámenes físicos de inmigración completos y procesamiento del formulario i693 para solicitudes de tarjeta verde.",

        "Dr. Efi Kessous - USCIS Authorized": "Dr. Efi Kessous - Autorizado por USCIS",
        "Dr. Efi Kessous - Authorized AME": "Dr. Efi Kessous - AME Autorizado",

        "Occupational health programs, workers' compensation exams, and on-site wellness services.":
            "Programas de salud ocupacional, exámenes de compensación de trabajadores y servicios de bienestar en el lugar.",

        "Aviation medical examinations for pilots by an authorized Aviation Medical Examiner (AME).":
            "Exámenes médicos de aviación para pilotos por un Examinador Médico de Aviación (AME) autorizado.",

        "Licensed physician examinations for DUI requirements and MVA compliance.":
            "Exámenes de médico licenciado para requisitos de DUI y cumplimiento de MVA.",

        "Learn more about our occupational health and occupation and health services":
            "Conozca más sobre nuestra salud ocupacional y servicios de ocupación y salud",

        "What is an i693 USCIS Medical Exam and Immigration Physical?":
            "¿Qué es un Examen Médico i693 USCIS y Examen Físico de Inmigración?",

        "Individuals applying for a green card (lawful permanent residence) must undergo a USCIS medical exam and complete the i693 form by a licensed medical professional authorized by USCIS. The purpose of this i693 USCIS medical exam is to check green card applicants for pre-existing conditions that would preclude their applications from being approved.":
            "Las personas que solicitan una tarjeta verde deben someterse a un examen médico USCIS y completar el formulario i693 por un profesional médico licenciado autorizado por USCIS. El propósito de este examen médico i693 USCIS es verificar a los solicitantes de tarjeta verde en busca de condiciones preexistentes.",

        "During the USCIS medical exam, the physician will check for communicable diseases through the i693 examination and provide any required vaccinations for the i693 form completion.":
            "Durante el examen médico USCIS, el médico verificará enfermedades transmisibles a través del examen i693 y proporcionará las vacunas requeridas para la finalización del formulario i693.",

        "What should I bring to my i693 USCIS Medical Exam?":
            "¿Qué debo traer a mi Examen Médico i693 USCIS?",

        "You should come to your USCIS medical exam appointment with a government issued ID, such as a driving license or passport, and a copy of your immunization records for the i693 form processing.":
            "Debe venir a su cita de examen médico USCIS con una identificación emitida por el gobierno, como una licencia de conducir o pasaporte, y una copia de sus registros de vacunación para el procesamiento del formulario i693.",

        "How long does it take to get the i693 paperwork after my USCIS medical exam?":
            "¿Cuánto tiempo tarda en obtener el papeleo i693 después de mi examen médico USCIS?",

        "If all the i693 test results come back normal from your USCIS medical exam, you can typically expect a call within 1-2 weeks to let you know that the i693 paperwork is ready to collect.":
            "Si todos los resultados de las pruebas i693 regresan normales de su examen médico USCIS, puede esperar típicamente una llamada dentro de 1-2 semanas.",

        "Dr Efi Kessous is an authorized USCIS physician for i693 and USCIS medical exam services":
            "El Dr. Efi Kessous es un médico USCIS autorizado para servicios de examen médico i693 y USCIS",

        "Schedule Your i693 USCIS Medical Exam": "Programe Su Examen Médico i693 USCIS",

        "We conduct pre-hire physical examinations and drug tests to ensure your new employees are fit for duty.":
            "Realizamos exámenes físicos previos a la contratación y pruebas de drogas para garantizar que sus nuevos empleados estén aptos para trabajar.",

        "If an employee was injured on the job, our occupational health physician will complete the necessary occupation and health paperwork after conducting a thorough examination.":
            "Si un empleado se lesionó en el trabajo, nuestro médico de salud ocupacional completará el papeleo necesario de ocupación y salud después de realizar un examen exhaustivo.",

        "Schedule an occupational health wellness day at your office. Our occupation and health physician will provide flu shots, health screenings, and quick check-ups for comprehensive occupational health care.":
            "Programe un día de bienestar de salud ocupacional en su oficina. Nuestro médico de ocupación y salud proporcionará vacunas contra la gripe, exámenes de salud y chequeos rápidos para atención integral de salud ocupacional.",

        "Comprehensive evaluations to ensure employees are ready to safely return to work after illness or injury.":
            "Evaluaciones integrales para garantizar que los empleados estén listos para regresar al trabajo de manera segura después de una enfermedad o lesión.",

        "In order to determine that you are fit to pilot an aircraft the Federal Aviation Administration requires that pilots take a FAA physical. This physical will inspect your physical and mental health and look at your medical history.":
            "Para determinar que usted está en condiciones de pilotar una aeronave, la Administración Federal de Aviación requiere que los pilotos realicen un examen físico de la FAA. Este examen físico inspeccionará su salud física y mental y revisará su historial médico.",

        "FAA physicals must be conducted by an authorized Aviation Medical Examiner (AME). Dr Efi Kessous is an authorized AME and has a wealth of experience performing these physicals.":
            "Los exámenes físicos de la FAA deben ser realizados por un Examinador Médico de Aviación (AME) autorizado. El Dr. Efi Kessous es un AME autorizado y tiene amplia experiencia realizando estos exámenes físicos.",

        "There are three classes of FAA physicals: 1st, 2nd, and 3rd. Generally 1st class is for airline transport pilots. 2nd class is for commercial pilots and 3rd class is for student and recreational pilots.":
            "Hay tres clases de exámenes físicos de la FAA: 1ª, 2ª y 3ª. Generalmente la 1ª clase es para pilotos de transporte aéreo. La 2ª clase es para pilotos comerciales y la 3ª clase es para pilotos estudiantes y recreativos.",

        "Montgomery Medical Clinic is proud to work with the Washington International Flight Academy in Washington, DC.":
            "Montgomery Medical Clinic se enorgullece de trabajar con la Academia Internacional de Vuelo de Washington en Washington, DC.",

        "If you've been charged with a DUI, it may be required that you complete a physical with a licensed physician. Dr. Efi Kessous conducts DUI Physicals.":
            "Si ha sido acusado de DUI, puede ser necesario que complete un examen físico con un médico licenciado. El Dr. Efi Kessous realiza Exámenes Físicos de DUI.",

        "Call the office to schedule an appointment": "Llame a la oficina para programar una cita",

        // ── Occupational Health page (additional) ──
        "Immigration physicals, FAA exams, corporate wellness, and MVA physicals in Gaithersburg, MD.":
            "Exámenes físicos de inmigración, exámenes FAA, bienestar corporativo y exámenes físicos MVA en Gaithersburg, MD.",

        "Montgomery Medical Clinic provides a full range of occupational health services led by":
            "Montgomery Medical Clinic ofrece una gama completa de servicios de salud ocupacional dirigidos por",

        "a USCIS-authorized civil surgeon, FAA Senior Aviation Medical Examiner, and board-certified occupational medicine physician.":
            "un cirujano civil autorizado por USCIS, Examinador Médico de Aviación Senior de la FAA y médico certificado en medicina ocupacional.",

        "Immigration Physicals": "Exámenes Físicos de Inmigración",
        "Corporate Wellness": "Bienestar Corporativo",

        "i693 USCIS Medical Exam": "Examen Médico i693 USCIS",
        "Dr. Efraim Kessous": "Dr. Efraim Kessous",
        "USCIS Authorized Civil Surgeon": "Cirujano Civil Autorizado por USCIS",
        "Senior Aviation Medical Examiner (AME)": "Examinador Médico de Aviación Senior (AME)",
        "Licensed Physician": "Médico Licenciado",

        "Book an Appointment": "Reservar una Cita",

        "Before Your Visit": "Antes de Su Visita",
        "What to Bring": "Qué Traer",
        "Come prepared with the following to ensure a smooth appointment and timely I-693 form processing.":
            "Venga preparado con lo siguiente para garantizar una cita fluida y un procesamiento oportuno del formulario I-693.",
        "Government Photo ID": "Identificación con Foto del Gobierno",
        "Vaccination Records": "Registros de Vacunación",
        "Current Medications List": "Lista de Medicamentos Actuales",
        "Prior TB/STI Records": "Registros Previos de TB/ETS",

        "After Your Exam": "Después de Su Examen",
        "Turnaround Time": "Tiempo de Procesamiento",
        "Sealed & Signed": "Sellado y Firmado",
        "1–2 Week Processing": "Procesamiento de 1–2 Semanas",

        "Resources": "Recursos",
        "Government Resources": "Recursos del Gobierno",
        "Official links to help you prepare for your immigration medical exam and understand the requirements.":
            "Enlaces oficiales para ayudarle a prepararse para su examen médico de inmigración y comprender los requisitos.",
        "USCIS Civil Surgeon Finder": "Buscador de Cirujanos Civiles USCIS",
        "CDC Vaccination Guide": "Guía de Vacunación del CDC",

        "Authorization": "Autorización",
        "Why Montgomery Medical Clinic": "Por Qué Montgomery Medical Clinic",
        "USCIS Authorized": "Autorizado por USCIS",
        "CDC Compliant": "Cumple con CDC",

        "Immigration Physicals & I-693 Guide": "Guía de Exámenes Físicos de Inmigración e I-693",
        "View Immigration Physicals Guide": "Ver Guía de Exámenes Físicos de Inmigración",
        "Schedule Your Immigration Exam": "Programe Su Examen de Inmigración",

        "Certificate Classes": "Clases de Certificado",
        "Who Needs an FAA Physical": "Quién Necesita un Examen Físico de la FAA",
        "All pilots need a valid FAA medical certificate. The class depends on how you fly.":
            "Todos los pilotos necesitan un certificado médico FAA válido. La clase depende de cómo vuela.",
        "1st Class — Airline Transport": "1ª Clase — Transporte Aéreo",
        "2nd Class — Commercial": "2ª Clase — Comercial",
        "3rd Class — Student & Recreational": "3ª Clase — Estudiante y Recreativo",

        "How to Prepare": "Cómo Prepararse",
        "AME Guide": "Guía AME",
        "AMAS Medication Database": "Base de Datos de Medicamentos AMAS",

        "Renewals": "Renovaciones",
        "How Often to Renew": "Con Qué Frecuencia Renovar",
        "6–60 Month Intervals": "Intervalos de 6–60 Meses",
        "Age-Dependent": "Depende de la Edad",

        "Partner program:": "Programa de asociación:",
        "FAA Pilot Resource Center": "Centro de Recursos para Pilotos FAA",
        "Open Pilot Resource Center": "Abrir Centro de Recursos para Pilotos",
        "Schedule Your FAA Physical": "Programe Su Examen Físico FAA",

        "Fit-for-Duty Physicals": "Exámenes de Aptitud para el Trabajo",
        "Respirator Fit Testing": "Prueba de Ajuste de Respirador",
        "Audiometric Testing": "Prueba Audiométrica",
        "Lift & Strength": "Levantamiento y Fuerza",

        "Workers' Compensation": "Compensación Laboral",
        "Compassionate care for on-the-job injuries with a clear clinical path to recovery, following":
            "Atención compasiva para lesiones en el trabajo con un camino clínico claro hacia la recuperación, siguiendo",
        "guidelines.": "directrices.",
        "Injury Evaluation": "Evaluación de Lesiones",
        "Treatment Plans": "Planes de Tratamiento",
        "Follow-Up Care": "Atención de Seguimiento",

        "On-Site Services": "Servicios en el Lugar",
        "Corporate Wellness Days": "Días de Bienestar Corporativo",
        "Flu Shot Clinics": "Clínicas de Vacunas contra la Gripe",
        "Blood Pressure": "Presión Arterial",
        "Biometric Screening": "Examen Biométrico",

        "Recovery": "Recuperación",
        "Functional Capacity": "Capacidad Funcional",
        "Medical Clearance": "Autorización Médica",
        "Work Restrictions": "Restricciones Laborales",

        "Compliance & Prevention": "Cumplimiento y Prevención",
        "OSHA Surveillance & Vaccinations": "Vigilancia OSHA y Vacunas",
        "Hepatitis B": "Hepatitis B",
        "Tdap & Flu": "Tdap y Gripe",
        "TB Screening": "Detección de TB",
        "Bloodborne Pathogens": "Patógenos Transmitidos por Sangre",

        "Why businesses choose us:": "Por qué las empresas nos eligen:",
        "Flexible scheduling for teams of any size, clear and timely reporting for HR and insurers, and a single physician-led point of contact for all your workforce health needs.":
            "Programación flexible para equipos de cualquier tamaño, informes claros y oportunos para RR.HH. y aseguradoras, y un único punto de contacto dirigido por un médico para todas sus necesidades de salud laboral.",

        "Corporate Health Services": "Servicios de Salud Corporativa",
        "View Corporate Health Services": "Ver Servicios de Salud Corporativa",
        "Call to Discuss Corporate Programs": "Llame para Discutir Programas Corporativos",
        "Request a Consultation": "Solicitar una Consulta",

        "MVA Physicals for DUI": "Exámenes Físicos MVA para DUI",
        "What to Expect": "Qué Esperar",
        "Physical Examination": "Examen Físico",
        "Medical History Review": "Revisión de Historial Médico",
        "MVA Documentation": "Documentación MVA",

        "How to Book": "Cómo Reservar",
        "MVA physicals are scheduled by phone. Call our office and we'll find a time that works for you so you can get your paperwork completed and submitted promptly.":
            "Los exámenes físicos MVA se programan por teléfono. Llame a nuestra oficina y encontraremos un horario que le convenga para que pueda completar y enviar su documentación de manera oportuna.",
        "Same-Week Availability": "Disponibilidad en la Misma Semana",
        "Quick Turnaround": "Respuesta Rápida",

        "Frequently Asked Questions": "Preguntas Frecuentes",
        "Common questions about our occupational health services.": "Preguntas comunes sobre nuestros servicios de salud ocupacional.",
        "What occupational health services does Montgomery Medical Clinic offer?":
            "¿Qué servicios de salud ocupacional ofrece Montgomery Medical Clinic?",
        "We provide a full suite of occupational health services for individuals and employers in the Gaithersburg, MD area:":
            "Ofrecemos una gama completa de servicios de salud ocupacional para individuos y empleadores en el área de Gaithersburg, MD:",
        "I-693 USCIS immigration medical exams": "Exámenes médicos de inmigración I-693 USCIS",
        "FAA aviation medical exams": "Exámenes médicos de aviación FAA",
        "Pre-employment physicals and drug testing": "Exámenes físicos previos al empleo y pruebas de drogas",
        "Workplace health screenings": "Evaluaciones de salud en el lugar de trabajo",

        "Workers' compensation and return-to-work evaluations": "Compensación laboral y evaluaciones de regreso al trabajo",

        "Do you offer drug testing for employers?": "¿Ofrecen pruebas de drogas para empleadores?",
        "we provide workplace drug testing including:": "proporcionamos pruebas de drogas en el lugar de trabajo que incluyen:",
        "Pre-employment drug screens": "Pruebas de drogas previas al empleo",
        "Random and post-accident testing": "Pruebas aleatorias y post-accidente",
        "Corporate accounts for ongoing employer needs": "Cuentas corporativas para necesidades continuas del empleador",

        "Do I need an appointment for a pre-employment physical?":
            "¿Necesito una cita para un examen físico previo al empleo?",
        "for the fastest service, but walk-ins are also accepted.":
            "para el servicio más rápido, pero también se aceptan pacientes sin cita.",

        "Does Montgomery Medical Clinic do FAA physicals?": "¿Montgomery Medical Clinic realiza exámenes físicos FAA?",
        "We have an FAA-authorized Aviation Medical Examiner (AME) on staff who performs":
            "Tenemos un Examinador Médico de Aviación (AME) autorizado por la FAA en nuestro personal que realiza",
        "FAA medical exams for pilots and aviation professionals.":
            "exámenes médicos FAA para pilotos y profesionales de la aviación.",

        "Book online or call us to set up your appointment.": "Reserve en línea o llámenos para programar su cita.",

        // ── Corporate Health page ──
        "Corporate Health": "Salud Corporativa",

        "Physician-led workplace health programs for Maryland businesses":
            "Programas de salud laboral dirigidos por médicos para empresas de Maryland",
        "from pre-employment physicals and OSHA surveillance to workers' comp care and on-site wellness.":
            "desde exámenes físicos previos al empleo y vigilancia OSHA hasta atención de compensación laboral y bienestar en el sitio.",

        "In This Page": "En Esta Página",
        "Pre-Employment Exams": "Exámenes Previos al Empleo",
        "OSHA Surveillance": "Vigilancia OSHA",
        "Diagnostic Testing": "Pruebas Diagnósticas",
        "Drug Testing Panels": "Paneles de Pruebas de Drogas",
        "Workers' Comp & RTW": "Comp. Laboral y Regreso al Trabajo",
        "Call to Discuss Programs": "Llame para Discutir Programas",
        "FAQ": "Preguntas Frecuentes",

        "Corporate Occupational Health Programs": "Programas de Salud Ocupacional Corporativa",
        "Montgomery Medical Clinic offers a complete suite of employer-focused occupational health services. Each program is customized to your workforce, industry hazards, and regulatory obligations.":
            "Montgomery Medical Clinic ofrece un conjunto completo de servicios de salud ocupacional enfocados en el empleador. Cada programa se personaliza según su fuerza laboral, los riesgos de la industria y las obligaciones regulatorias.",

        "Pre-Employment": "Previo al Empleo",
        "Workplace Injury": "Lesión en el Trabajo",
        "Why Choose Us": "Por Qué Elegirnos",
        "Physician-Led, Business-Ready": "Dirigido por Médicos, Listo para Empresas",

        "Pre-Employment & Fit-for-Duty Physicals": "Exámenes Previos al Empleo y de Aptitud para el Trabajo",
        "What's Included in a Standard Pre-Employment Physical": "Qué Incluye un Examen Físico Previo al Empleo Estándar",
        "Role-Specific Add-On Components": "Componentes Adicionales Específicos del Puesto",
        "Test / Evaluation": "Prueba / Evaluación",
        "Who Typically Requires It": "Quién Normalmente lo Requiere",
        "Standard Reference": "Referencia Estándar",
        "What Employers Should Send Us": "Qué Deben Enviarnos los Empleadores",

        "OSHA Medical Surveillance Programs": "Programas de Vigilancia Médica OSHA",
        "Screening vs. Surveillance: An Important Distinction": "Detección vs. Vigilancia: Una Distinción Importante",
        "Respiratory Protection Program": "Programa de Protección Respiratoria",
        "Hearing Conservation Program": "Programa de Conservación Auditiva",
        "Chemical & Hazardous Substance Exposure": "Exposición a Sustancias Químicas y Peligrosas",
        "Ergonomic & Musculoskeletal Surveillance": "Vigilancia Ergonómica y Musculoesquelética",
        "TB Surveillance (Healthcare & High-Risk Settings)": "Vigilancia de TB (Entornos de Salud y Alto Riesgo)",
        "OSHA Documentation & Record-Keeping": "Documentación y Mantenimiento de Registros OSHA",

        "Diagnostic Testing Capabilities": "Capacidades de Pruebas Diagnósticas",
        "Test": "Prueba",
        "What It Measures": "Qué Mide",
        "Typical Use": "Uso Típico",
        "Structured Reporting for Employers": "Informes Estructurados para Empleadores",

        "5-Panel Screen": "Panel de 5 Pruebas",
        "10-Panel Screen": "Panel de 10 Pruebas",
        "16-Panel Screen": "Panel de 16 Pruebas",
        "Testing Types We Perform": "Tipos de Pruebas que Realizamos",
        "Random": "Aleatorio",
        "Post-Accident": "Post-Accidente",
        "Reasonable Suspicion": "Sospecha Razonable",

        "Workers' Compensation & Return-to-Work": "Compensación Laboral y Regreso al Trabajo",
        "Workplace Injury Care": "Atención de Lesiones Laborales",
        "Return-to-Work Evaluations": "Evaluaciones de Regreso al Trabajo",
        "Initial Injury Evaluation": "Evaluación Inicial de Lesión",
        "Diagnosis & Treatment Plan": "Diagnóstico y Plan de Tratamiento",
        "Work Status Documentation": "Documentación de Estado Laboral",
        "Ongoing Follow-Up": "Seguimiento Continuo",
        "Maryland WCC Compliance": "Cumplimiento con WCC de Maryland",
        "Medical Record Review": "Revisión de Registros Médicos",
        "Functional Capacity Assessment": "Evaluación de Capacidad Funcional",
        "Work Restriction Determination": "Determinación de Restricciones Laborales",
        "Medical Clearance Letter": "Carta de Autorización Médica",
        "Modified Duty Planning": "Planificación de Deberes Modificados",
        "Common Occupational Injuries We Treat": "Lesiones Ocupacionales Comunes que Tratamos",

        "On-Site Corporate Wellness Programs": "Programas de Bienestar Corporativo en el Lugar",
        "Seasonal Flu Shot Clinics": "Clínicas de Vacunas contra la Gripe Estacionales",
        "Biometric Screenings": "Exámenes Biométricos",
        "Blood Pressure & Cardiovascular Checks": "Controles de Presión Arterial y Cardiovasculares",
        "TB & Infectious Disease Screening": "Detección de TB y Enfermedades Infecciosas",
        "Health Education & Counseling": "Educación y Asesoría en Salud",
        "Flexible Scheduling for Any Team Size": "Programación Flexible para Cualquier Tamaño de Equipo",
        "Vaccination": "Vacunación",
        "Screening": "Detección",
        "Cardiovascular": "Cardiovascular",
        "Infectious Disease": "Enfermedad Infecciosa",
        "Education": "Educación",
        "Logistics": "Logística",

        "Occupational Vaccinations": "Vacunas Ocupacionales",
        "Vaccine": "Vacuna",
        "Schedule / Notes": "Horario / Notas",
        "ACIP-Based Vaccination Guidance": "Guía de Vacunación Basada en ACIP",

        "Ready to Build Your Corporate Health Program?": "¿Listo para Crear Su Programa de Salud Corporativa?",

        "What is included in a pre-employment physical?": "¿Qué incluye un examen físico previo al empleo?",
        "What OSHA surveillance programs do you support?": "¿Qué programas de vigilancia OSHA apoyan?",
        "What is a respirator fit test and how often is it required?": "¿Qué es una prueba de ajuste de respirador y con qué frecuencia se requiere?",
        "Do you handle workers' compensation cases?": "¿Manejan casos de compensación laboral?",
        "What drug panels do you offer?": "¿Qué paneles de pruebas de drogas ofrecen?",
        "Can you come to our workplace for wellness events?": "¿Pueden ir a nuestro lugar de trabajo para eventos de bienestar?",
        "How do I set up a corporate account for ongoing occupational health services?":
            "¿Cómo establezco una cuenta corporativa para servicios continuos de salud ocupacional?",
        "What is the difference between medical screening and medical surveillance?":
            "¿Cuál es la diferencia entre detección médica y vigilancia médica?",

        "Answers to common questions from HR managers, safety officers, and business owners exploring occupational health programs.":
            "Respuestas a preguntas comunes de gerentes de RR.HH., oficiales de seguridad y propietarios de negocios que exploran programas de salud ocupacional.",

        // ── Five Elements Acupuncture page ──
        "Five Elements Acupuncture & Wellness - Licensed Acupuncture in Gaithersburg, MD":
            "Acupuntura y Bienestar Cinco Elementos - Acupuntura Licenciada en Gaithersburg, MD",

        "Our Five Elements Acupuncture & Wellness clinic combines traditional Chinese medicine, acupuncture therapy, and functional medicine with evidence-based holistic medicine practices for optimal wellness and pain management in Gaithersburg, MD.":
            "Nuestra clínica de Acupuntura y Bienestar Cinco Elementos combina la medicina tradicional china, la terapia de acupuntura y la medicina funcional con prácticas de medicina holística basadas en evidencia para el bienestar óptimo y el manejo del dolor en Gaithersburg, MD.",

        "Acupuncture is a time-tested traditional Chinese medicine practice where precisely placed sterile needles stimulate specific points on the body. Dr. Min Lu integrates acupuncture therapy with holistic wellness care, functional medicine, and pain management strategies to support your unique healing journey.":
            "La acupuntura es una práctica de medicina tradicional china probada en el tiempo donde agujas estériles colocadas con precisión estimulan puntos específicos del cuerpo. La Dra. Min Lu integra la terapia de acupuntura con el cuidado holístico del bienestar, la medicina funcional y las estrategias de manejo del dolor para apoyar su viaje de curación único.",

        "At our Five Elements Acupuncture clinic, we honor the principles of traditional Chinese medicine, where health results from harmony within the body's energy systems. Our comprehensive acupuncture approach focuses on treating root causes rather than just managing symptoms. We combine acupuncture therapy, herbal medicine, lifestyle guidance, and functional medicine principles to support long-term wellness and vitality.":
            "En nuestra clínica de Acupuntura Cinco Elementos, honramos los principios de la medicina tradicional china, donde la salud resulta de la armonía dentro de los sistemas de energía del cuerpo. Nuestro enfoque integral de acupuntura se centra en tratar las causas raíz en lugar de simplemente manejar los síntomas. Combinamos terapia de acupuntura, medicina herbal, orientación sobre estilo de vida y principios de medicina funcional para apoyar el bienestar y la vitalidad a largo plazo.",

        "Every patient receives a customized acupuncture treatment plan based on a detailed consultation, traditional diagnostic methods (such as pulse reading and tongue analysis), and modern functional medicine assessment. Dr. Lu's acupuncture expertise includes specialized therapies such as moxibustion, cupping, gua sha, and herbal medicine integration to optimize your health and wellness journey.":
            "Cada paciente recibe un plan de tratamiento de acupuntura personalizado basado en una consulta detallada, métodos diagnósticos tradicionales (como la lectura del pulso y el análisis de la lengua) y una evaluación de medicina funcional moderna. La experiencia en acupuntura de la Dra. Lu incluye terapias especializadas como moxibustión, ventosas, gua sha e integración de medicina herbal.",

        "Dr. Min Lu provides a comprehensive range of acupuncture and holistic medicine services designed to support your wellness goals and address specific health conditions.":
            "La Dra. Min Lu proporciona una amplia gama de servicios de acupuntura y medicina holística diseñados para apoyar sus objetivos de bienestar y abordar condiciones de salud específicas.",

        "Professional needle placement for pain relief, stress reduction, and overall wellness":
            "Colocación profesional de agujas para alivio del dolor, reducción del estrés y bienestar general",

        "Acupuncture treatment to calm the nervous system and promote emotional balance":
            "Tratamiento de acupuntura para calmar el sistema nervioso y promover el equilibrio emocional",

        "Acupuncture treatment for sleep disorders": "Tratamiento de acupuntura para trastornos del sueño",
        "Ancient technique combined with acupuncture": "Técnica antigua combinada con acupuntura",
        "Heat therapy to enhance acupuncture treatment": "Terapia de calor para mejorar el tratamiento de acupuntura",
        "Acupuncture for fertility and reproductive health": "Acupuntura para fertilidad y salud reproductiva",
        "Acupuncture for digestive disorders and wellness": "Acupuntura para trastornos digestivos y bienestar",

        "Dr. Lu provides specialized care for a wide range of conditions, combining traditional Chinese medicine with modern functional health practices.":
            "La Dra. Lu proporciona atención especializada para una amplia gama de condiciones, combinando la medicina tradicional china con prácticas modernas de salud funcional.",

        "Infertility & Ovarian Dysfunction": "Infertilidad y Disfunción Ovárica",
        "Polycystic Ovary Syndrome (PCOS)": "Síndrome de Ovario Poliquístico (SOP)",
        "Menstrual Disease & Irregular Periods": "Enfermedad Menstrual y Períodos Irregulares",
        "Menopausal Syndrome": "Síndrome Menopáusico",
        "Pelvic Inflammatory Disease": "Enfermedad Inflamatoria Pélvica",
        "Vulva Leukoplakia": "Leucoplasia Vulvar",
        "Postnatal Care": "Atención Posnatal",
        "Insomnia & Sleep Disorders": "Insomnio y Trastornos del Sueño",
        "Allergies & Respiratory Issues": "Alergias y Problemas Respiratorios",
        "Pain Management (Chronic & Acute)": "Manejo del Dolor (Crónico y Agudo)",
        "Digestive Disorders": "Trastornos Digestivos",
        "Stress & Fatigue": "Estrés y Fatiga",

        "To receive high-quality holistic health care in a warm and welcoming environment, partner with Dr. Lu. Make an appointment at Five Elements Acupuncture & Wellness for professional acupuncture treatment by calling the office or booking online today.":
            "Para recibir atención médica holística de alta calidad en un ambiente cálido y acogedor, asóciese con la Dra. Lu. Haga una cita en Acupuntura y Bienestar Cinco Elementos para tratamiento de acupuntura profesional llamando a la oficina o reservando en línea hoy.",

        "Every acupuncture visit begins with thoughtful listening, collaborative goal-setting, and a tailored treatment plan that integrates traditional Chinese medicine, bodywork, and lifestyle guidance for lasting wellness.":
            "Cada visita de acupuntura comienza con una escucha reflexiva, establecimiento colaborativo de objetivos y un plan de tratamiento personalizado que integra la medicina tradicional china, trabajo corporal y orientación sobre estilo de vida para un bienestar duradero.",

        "Dr. Lu performs a detailed health history, pulse reading, and tongue analysis to understand the root imbalances before beginning your acupuncture session.":
            "La Dra. Lu realiza un historial de salud detallado, lectura del pulso y análisis de la lengua para comprender los desequilibrios raíz antes de comenzar su sesión de acupuntura.",

        "Precise acupuncture point selection, gentle needling, and supportive modalities like moxibustion or cupping amplify circulation, reduce pain, and restore energy flow.":
            "La selección precisa de puntos de acupuntura, la inserción suave de agujas y las modalidades de apoyo como la moxibustión o las ventosas amplían la circulación, reducen el dolor y restauran el flujo de energía.",

        "Sessions may include herbal guidance, massage therapy, or stress management tools that complement acupuncture and help you maintain balance between visits.":
            "Las sesiones pueden incluir orientación herbal, masoterapia o herramientas de manejo del estrés que complementan la acupuntura y le ayudan a mantener el equilibrio entre visitas.",

        "Regular acupuncture follow-ups, personalized nutrition tips, and movement recommendations keep your wellness plan actionable and aligned with your lifestyle.":
            "El seguimiento regular de acupuntura, consejos de nutrición personalizados y recomendaciones de movimiento mantienen su plan de bienestar accionable y alineado con su estilo de vida.",

        "WE ACCEPT MOST INSURANCE PROVIDERS": "ACEPTAMOS LA MAYORÍA DE LOS PROVEEDORES DE SEGURO",
        "We also accept auto and personal injury insurance for acupuncture treatments.":
            "También aceptamos seguros de accidentes de auto y lesiones personales para tratamientos de acupuntura.",

        "If you have specific questions regarding your coverage for acupuncture services, please contact us for additional information.":
            "Si tiene preguntas específicas sobre su cobertura para servicios de acupuntura, contáctenos para obtener información adicional.",

        "Simple habits before and after each acupuncture appointment help you feel relaxed, supported, and ready to embrace the healing process Dr. Lu designs for you.":
            "Los hábitos simples antes y después de cada cita de acupuntura le ayudan a sentirse relajado, apoyado y listo para abrazar el proceso de curación que la Dra. Lu diseña para usted.",

        "Enjoy a light, nourishing meal and arrive hydrated to support acupuncture circulation.":
            "Disfrute de una comida ligera y nutritiva y llegue hidratado para apoyar la circulación de acupuntura.",

        "Wear comfortable clothing that can easily be rolled to access acupuncture points on the arms and legs.":
            "Use ropa cómoda que se pueda enrollar fácilmente para acceder a los puntos de acupuntura en los brazos y las piernas.",

        "Settle into a quiet, spa-like environment while Dr. Lu places acupuncture needles with precision and care.":
            "Instálese en un ambiente tranquilo similar a un spa mientras la Dra. Lu coloca las agujas de acupuntura con precisión y cuidado.",

        "Experience complementary therapies such as cupping therapy, moxibustion, or massage therapy when appropriate.":
            "Experimente terapias complementarias como terapia de ventosas, moxibustión o masoterapia cuando sea apropiado.",

        "Drink water, rest, and notice how your body responds as the acupuncture session continues to work.":
            "Beba agua, descanse y note cómo responde su cuerpo mientras la sesión de acupuntura continúa trabajando.",

        "Follow the customized acupuncture care plan, including herbal medicine and gentle exercises between visits.":
            "Siga el plan de atención de acupuntura personalizado, incluyendo medicina herbal y ejercicios suaves entre visitas.",

        "Schedule your acupuncture consultation with Dr. Min Lu today and experience the benefits of traditional Chinese medicine and professional acupuncture care in Gaithersburg, MD.":
            "Programe su consulta de acupuntura con la Dra. Min Lu hoy y experimente los beneficios de la medicina tradicional china y la atención de acupuntura profesional en Gaithersburg, MD.",

        // ── Nutrition & Wellness page ──
        "Our Wellness Center take a functional and holistic approach to health—helping you achieve your goals through customized nutrition and fitness programs. We focus on improving balance, strength, and overall well-being through personalized nutrition planning and guided personal training. Every program is designed to help you feel stronger, more energized, and in control of your health.":
            "Nuestro Centro de Bienestar adopta un enfoque funcional y holístico de la salud, ayudándole a alcanzar sus objetivos a través de programas personalizados de nutrición y fitness. Nos centramos en mejorar el equilibrio, la fuerza y el bienestar general a través de la planificación nutricional personalizada y el entrenamiento personal guiado. Cada programa está diseñado para ayudarle a sentirse más fuerte, con más energía y en control de su salud.",

        "Our wellness centers offer functional medicine and holistic medicine approaches to health. Our functional doctors combine expert nutrition guidance with personalized fitness training to optimize your well-being. Whether you need functional medicine for a health condition or holistic medicine for wellness optimization, our integrated programs at our wellness centers help you succeed.":
            "Nuestros centros de bienestar ofrecen enfoques de medicina funcional y medicina holística para la salud. Nuestros médicos funcionales combinan orientación nutricional experta con entrenamiento físico personalizado para optimizar su bienestar. Ya sea que necesite medicina funcional para una condición de salud o medicina holística para la optimización del bienestar, nuestros programas integrados en nuestros centros de bienestar le ayudan a tener éxito.",

        "Evidence-based functional medicine and holistic medicine nutrition counseling at our wellness center, tailored by our functional doctors to your health goals and medical needs.":
            "Asesoramiento nutricional de medicina funcional y medicina holística basado en evidencia en nuestro centro de bienestar, adaptado por nuestros médicos funcionales a sus objetivos de salud y necesidades médicas.",

        "Our certified functional doctors and nutrition specialists at our wellness center use functional medicine and holistic medicine principles to create comprehensive nutrition plans addressing your unique wellness needs.":
            "Nuestros médicos funcionales certificados y especialistas en nutrición en nuestro centro de bienestar usan principios de medicina funcional y medicina holística para crear planes de nutrición integrales que abordan sus necesidades únicas de bienestar.",

        "Customized wellness and fitness programs at our wellness center designed using functional medicine principles to help you build strength, improve performance, and reach your wellness goals.":
            "Programas personalizados de bienestar y fitness en nuestro centro de bienestar diseñados usando principios de medicina funcional para ayudarle a desarrollar fuerza, mejorar el rendimiento y alcanzar sus objetivos de bienestar.",

        "Our certified personal trainers work closely alongside patients to fully understand their individual needs, assess physical limitations, and develop customized programs that properly strengthen the body while preventing injury.":
            "Nuestros entrenadores personales certificados trabajan estrechamente junto a los pacientes para comprender completamente sus necesidades individuales, evaluar las limitaciones físicas y desarrollar programas personalizados que fortalecen correctamente el cuerpo mientras previenen lesiones.",

        "Nutrition and fitness work hand-in-hand for optimal results. Our integrated approach ensures you get the most effective care.":
            "La nutrición y el fitness trabajan de la mano para obtener resultados óptimos. Nuestro enfoque integrado garantiza que reciba la atención más efectiva.",

        "Your functional medicine nutrition and training plans from our functional doctors at our wellness centers work together seamlessly using holistic medicine principles.":
            "Sus planes de nutrición y entrenamiento de medicina funcional de nuestros médicos funcionales en nuestros centros de bienestar trabajan juntos sin problemas usando principios de medicina holística.",

        "Combining functional medicine nutrition with exercise at our wellness centers accelerates your progress and maximizes wellness outcomes.":
            "Combinar la nutrición de medicina funcional con ejercicio en nuestros centros de bienestar acelera su progreso y maximiza los resultados de bienestar.",

        "Our wellness programs are backed by functional doctors and holistic medicine practitioners at our wellness centers for safe, effective wellness care.":
            "Nuestros programas de bienestar están respaldados por médicos funcionales y practicantes de medicina holística en nuestros centros de bienestar para una atención de bienestar segura y efectiva.",

        "Our nutrition and fitness professionals collaborate with the clinical team to deliver practical guidance, approachable coaching, and the accountability you need to live well.":
            "Nuestros profesionales de nutrición y fitness colaboran con el equipo clínico para proporcionar orientación práctica, coaching accesible y la responsabilidad que necesita para vivir bien.",

        "Hodaya partners with patients to translate medical recommendations into real-world nutrition habits. She focuses on sustainable meal planning, mindful eating strategies, and building confidence in the kitchen so every client can make consistent, nourishing choices.":
            "Hodaya trabaja con los pacientes para traducir las recomendaciones médicas en hábitos nutricionales del mundo real. Se centra en la planificación de comidas sostenible, estrategias de alimentación consciente y la construcción de confianza en la cocina para que cada cliente pueda hacer elecciones consistentes y nutritivas.",

        "Kevin designs individualized training programs that improve strength, mobility, and overall stamina. He blends functional movement with steady coaching support, helping each person stay motivated, recover safely, and celebrate measurable progress.":
            "Kevin diseña programas de entrenamiento individualizados que mejoran la fuerza, la movilidad y la resistencia general. Combina el movimiento funcional con apoyo de coaching constante, ayudando a cada persona a mantenerse motivada, recuperarse de manera segura y celebrar el progreso medible.",

        "Start your personalized wellness journey with our functional doctors and holistic medicine experts at our wellness centers today.":
            "Comience su viaje de bienestar personalizado con nuestros médicos funcionales y expertos en medicina holística en nuestros centros de bienestar hoy.",

        // ── Sports Medicine page ──
        "Comprehensive rehabilitation and sports injury care for athletes of all ages - from weekend warriors to professional competitors.":
            "Rehabilitación integral y atención de lesiones deportivas para atletas de todas las edades, desde guerreros de fin de semana hasta competidores profesionales.",

        "Our mission is to provide comprehensive, high-quality care to patients with any sports-related injury or medical problem. We know that education and prevention of injuries are of utmost importance, and we incorporate these principles to provide the best medical care available with the goal of returning our patients to activity as soon as possible.":
            "Nuestra misión es proporcionar atención integral y de alta calidad a pacientes con cualquier lesión o problema médico relacionado con los deportes. Sabemos que la educación y la prevención de lesiones son de suma importancia, e incorporamos estos principios para proporcionar la mejor atención médica disponible con el objetivo de devolver a nuestros pacientes a la actividad lo antes posible.",

        "Whether you are a professional athlete, a weekend warrior, a recreational runner or biker, a dancer, or a pee wee athlete, we will assist you in a professional and compassionate manner.":
            "Ya sea que sea un atleta profesional, un guerrero de fin de semana, un corredor o ciclista recreativo, un bailarín o un atleta juvenil, le asistiremos de manera profesional y compasiva.",

        "Sports Medicine is a specialty of medicine that relates to sports injury, sports nutrition, sports training and exercise. While many of our patients are athletes, we also help treat musculoskeletal injuries and conditions in non-athletes. If you suffer from foot pain, joint pain or back pain, we may be able to find a treatment that's right for you.":
            "La Medicina Deportiva es una especialidad de la medicina que se relaciona con lesiones deportivas, nutrición deportiva, entrenamiento deportivo y ejercicio. Si bien muchos de nuestros pacientes son atletas, también ayudamos a tratar lesiones y condiciones musculoesqueléticas en no atletas. Si sufre de dolor en los pies, dolor articular o dolor de espalda, podemos encontrar un tratamiento adecuado para usted.",

        "A Sports Medicine Specialist is a physician with specialized training in both the prevention and treatment of injuries and illness. The specialist helps patients to obtain maximal function and decrease disability and time out of work, school, or sports.":
            "Un Especialista en Medicina Deportiva es un médico con entrenamiento especializado tanto en la prevención como en el tratamiento de lesiones y enfermedades. El especialista ayuda a los pacientes a obtener la función máxima y disminuir la discapacidad y el tiempo fuera del trabajo, la escuela o los deportes.",

        "Board-certified physicians with specialized training in sports medicine.":
            "Médicos certificados con entrenamiento especializado en medicina deportiva.",

        "Dr. Eran Kessous is board certified in both family and sports medicine. He completed his sports medicine training at Harvard Medical School's Children's Hospital in Boston. Dr. Kessous received his medical degree from St. George's University in 1999, then completed a surgical internship at Mount Sinai School of Medicine in New York.":
            "El Dr. Eran Kessous está certificado tanto en medicina familiar como en medicina deportiva. Completó su entrenamiento en medicina deportiva en el Hospital de Niños de la Escuela de Medicina de Harvard en Boston. El Dr. Kessous recibió su título médico de la Universidad de St. George en 1999, luego completó una pasantía quirúrgica en la Escuela de Medicina Monte Sinai en Nueva York.",

        "After three years as a general and orthopedic surgery resident at Tel Aviv Medical Center, he returned to Boston to complete a family medicine residency at Boston University Medical Center.":
            "Después de tres años como residente de cirugía general y ortopédica en el Centro Médico de Tel Aviv, regresó a Boston para completar una residencia en medicina familiar en el Centro Médico de la Universidad de Boston.",

        "During his fellowship, Dr. Kessous was responsible for preventing, diagnosing and treating injuries for Boston Ballet dancers and Northeastern University athletic teams. He was also an official team physician for the Major League Soccer Team DC United and is currently the medical consultant for the Kirov Academy of Ballet in Washington, DC.":
            "Durante su beca, el Dr. Kessous fue responsable de prevenir, diagnosticar y tratar lesiones para los bailarines del Ballet de Boston y los equipos atléticos de la Universidad del Noreste. También fue médico oficial del equipo de la Major League Soccer DC United y actualmente es el consultor médico de la Academia de Ballet Kirov en Washington, DC.",

        "Dr. Lawless is board-certified in family medicine and sports medicine. He completed his sports medicine training and family medicine training at Northwell Plainview Hospital in Plainview, NY. Dr. Lawless graduated from medical school at Lake Erie College of Osteopathic Medicine in 2012.":
            "El Dr. Lawless está certificado en medicina familiar y medicina deportiva. Completó su entrenamiento en medicina deportiva y medicina familiar en el Hospital Northwell Plainview en Plainview, NY. El Dr. Lawless se graduó de la escuela de medicina en el Colegio de Medicina Osteopática del lago Erie en 2012.",

        "He completed a traditional rotating internship at UPMC Mercy Hospital in Pittsburgh, PA before starting his family medicine residency. He was also appointed a teaching associate in family medicine at Hofstra Northwell School of Medicine during his sports medicine fellowship.":
            "Completó una pasantía rotatoria tradicional en el Hospital UPMC Mercy en Pittsburgh, PA antes de comenzar su residencia en medicina familiar. También fue nombrado asociado docente en medicina familiar en la Escuela de Medicina Hofstra Northwell durante su beca en medicina deportiva.",

        "His experiences include team physician for LIU Post University football team, wrestling team, and men's lacrosse team, NY marathon planning committee and finish line coverage, and NXT wrestling medical coverage in NYC. His skills include musculoskeletal care, diagnostic musculoskeletal ultrasound, ultrasound-guided injections, and osteopathic manipulative treatment.":
            "Sus experiencias incluyen médico de equipo para el equipo de fútbol americano, equipo de lucha y equipo de lacrosse masculino de la Universidad LIU Post, comité de planificación del maratón de NY y cobertura en la línea de llegada, y cobertura médica de lucha NXT en NYC. Sus habilidades incluyen atención musculoesquelética, ultrasonido musculoesquelético diagnóstico, inyecciones guiadas por ultrasonido y tratamiento manipulativo osteopático.",

        "Schedule an appointment with our sports medicine specialists today.":
            "Programe una cita con nuestros especialistas en medicina deportiva hoy.",

        // ── Careers page ──
        "Be part of a team dedicated to providing exceptional healthcare to our community.":
            "Sea parte de un equipo dedicado a proporcionar atención médica excepcional a nuestra comunidad.",

        "We're currently seeking passionate, dedicated professionals to join our growing team. Explore our open positions below and apply today!":
            "Actualmente buscamos profesionales apasionados y dedicados para unirse a nuestro equipo en crecimiento. ¡Explore nuestras posiciones abiertas a continuación y solicite hoy!",

        "We are seeking a friendly, organized, and professional receptionist to be the welcoming face of our clinic. This role is crucial in creating a positive first impression for our patients.":
            "Buscamos un recepcionista amable, organizado y profesional para ser la cara de bienvenida de nuestra clínica. Este rol es crucial para crear una primera impresión positiva para nuestros pacientes.",

        "Greet and check-in patients with warmth and professionalism":
            "Recibir y registrar pacientes con calidez y profesionalismo",

        "Answer phone calls and schedule appointments": "Responder llamadas telefónicas y programar citas",
        "Verify insurance information and collect co-payments": "Verificar información de seguros y cobrar copagos",
        "Maintain organized patient records and files": "Mantener registros y archivos de pacientes organizados",
        "Coordinate with medical staff to ensure smooth patient flow": "Coordinar con el personal médico para garantizar un flujo fluido de pacientes",

        "Excellent communication and customer service skills": "Excelentes habilidades de comunicación y servicio al cliente",
        "Proficiency with computer systems and medical software": "Dominio de sistemas informáticos y software médico",
        "Strong organizational and multitasking abilities": "Sólidas habilidades de organización y multitarea",
        "Previous experience in healthcare setting preferred": "Se prefiere experiencia previa en entorno de atención médica",

        "Please email your resume/CV and cover letter to the address below. Make sure the subject line reads: \"Application - Front Desk Receptionist\"":
            "Por favor envíe su currículum/CV y carta de presentación a la dirección a continuación. Asegúrese de que el asunto diga: \"Solicitud - Recepcionista de Mostrador\"",

        "We are looking for a skilled and compassionate Medical Assistant to support our physicians and provide excellent patient care in our multi-specialty clinic.":
            "Buscamos un Asistente Médico hábil y compasivo para apoyar a nuestros médicos y proporcionar excelente atención al paciente en nuestra clínica multiespecialidad.",

        "Take and record patient vital signs and medical histories": "Tomar y registrar signos vitales e historiales médicos de pacientes",
        "Prepare patients for examinations and assist physicians during procedures": "Preparar pacientes para exámenes y asistir a médicos durante procedimientos",
        "Administer medications and injections as directed": "Administrar medicamentos e inyecciones según indicaciones",
        "Perform basic laboratory tests and EKGs": "Realizar pruebas básicas de laboratorio y electrocardiogramas",
        "Maintain cleanliness and stock supplies in exam rooms": "Mantener limpieza y suministros en las salas de examen",
        "Document patient information in electronic health records": "Documentar información del paciente en registros de salud electrónicos",

        "Certified Medical Assistant (CMA) or Registered Medical Assistant (RMA) preferred": "Se prefiere Asistente Médico Certificado (CMA) o Asistente Médico Registrado (RMA)",
        "CPR/BLS certification required": "Se requiere certificación CPR/BLS",
        "Strong clinical and patient care skills": "Sólidas habilidades clínicas y de atención al paciente",
        "Experience with EHR systems": "Experiencia con sistemas de EHR",
        "Excellent communication and teamwork abilities": "Excelentes habilidades de comunicación y trabajo en equipo",

        "Please email your resume/CV and cover letter to the address below. Make sure the subject line reads: \"Application - Medical Assistant\"":
            "Por favor envíe su currículum/CV y carta de presentación a la dirección a continuación. Asegúrese de que el asunto diga: \"Solicitud - Asistente Médico\"",

        "Comprehensive benefits package including health insurance and paid time off":
            "Paquete de beneficios integral que incluye seguro de salud y tiempo libre pagado",

        "Work alongside experienced professionals in a collaborative environment":
            "Trabaje junto a profesionales experimentados en un ambiente colaborativo",

        "Professional development and career advancement opportunities":
            "Oportunidades de desarrollo profesional y avance en la carrera",

        "For more information about these positions or general inquiries, please contact us:":
            "Para obtener más información sobre estos puestos o consultas generales, contáctenos:",

        // ── Navigation & shared UI ──
        "Home": "Inicio",
        "Services": "Servicios",
        "About": "Nosotros",
        "Insurance": "Seguros",
        "Contact": "Contacto",
        "About Us": "Sobre Nosotros",
        "Request Appointment": "Solicitar Cita",
        "Schedule Appointment": "Programar Cita",
        "Schedule Your Visit": "Programe Su Visita",
        "Patient Portal": "Portal del Paciente",
        "Urgent & Primary Care": "Cuidado Urgente y Primario",
        "Dermatology": "Dermatología",
        "Occupational Health": "Salud Ocupacional",
        "Five Elements Acupuncture": "Acupuntura Cinco Elementos",
        "Wellness Center": "Centro de Bienestar",
        "Sports Medicine & Physical Therapy": "Medicina Deportiva y Terapia Física",
        "Sports Medicine": "Medicina Deportiva",
        "Careers": "Carreras",
        "Call Us": "Llámenos",
        "Text Us": "Envíe Texto",
        "Email Us": "Envíe Correo",
        "Visit Us": "Visítenos",
        "Office Hours": "Horario de Oficina",
        "Get Directions →": "Obtener Direcciones →",
        "Get Directions": "Obtener Direcciones",
        "Walk-ins welcome. Schedule for guaranteed same-day care.": "Se aceptan pacientes sin cita. Programe para atención garantizada el mismo día.",
        "Live answers during hours. Urgent messages monitored 24/7.": "Respuestas en vivo durante el horario. Mensajes urgentes monitoreados 24/7.",
        "Speak with care coordinators": "Hable con coordinadores de atención",
        "Quick questions & updates": "Preguntas rápidas y actualizaciones",
        "Reply within one business day": "Respuesta en un día hábil",
        "Mon – Thu": "Lun – Jue",
        "Friday": "Viernes",
        "Sat/Sun": "Sáb/Dom",
        "Mon-Thu 8am-7pm | Fri 8am-6pm | Sat/Sun 8am-1pm": "Lun-Jue 8am-7pm | Vie 8am-6pm | Sáb/Dom 8am-1pm",

        // ── Footer ──
        "Your trusted partner for comprehensive healthcare in Gaithersburg, Maryland.": "Su socio de confianza para atención médica integral en Gaithersburg, Maryland.",
        "Hours": "Horario",
        "Mon-Thu: 8am - 7pm": "Lun-Jue: 8am - 7pm",
        "Friday: 8am - 6pm": "Viernes: 8am - 6pm",
        "Sat/Sun: 8am - 1pm": "Sáb/Dom: 8am - 1pm",

        // ── Index page ──
        "Available Today": "Disponible Hoy",
        "Specialized Services": "Servicios Especializados",
        "Walk-Ins Welcome": "Sin Cita Previa",
        "FAA & Immigration Physicals": "Exámenes Físicos de FAA e Inmigración",
        "Authorized Aviation Medical Examiner": "Examinador Médico de Aviación Autorizado",
        "USCIS-Authorized Civil Surgeon": "Cirujano Civil Autorizado por USCIS",
        "Same Day Urgent Care": "Atención Urgente el Mismo Día",
        "No appointment needed • Walk-in basis at our medical center": "Sin cita previa • Atención sin reserva en nuestro centro médico",
        "One Stop For All Your Medical Needs": "Todo en Un Solo Lugar Para Sus Necesidades Médicas",
        "Comprehensive multi-specialty care with expert doctors under one roof.": "Atención integral multiespecialidad con médicos expertos bajo un mismo techo.",
        "Explore Our Services": "Explorar Nuestros Servicios",
        "Insurances Accepted": "Seguros Aceptados",
        "Departments with Expert Doctors": "Departamentos con Médicos Expertos",
        "Patients Served Annually": "Pacientes Atendidos Anualmente",
        "Our Departments": "Nuestros Departamentos",
        "Comprehensive healthcare services delivered by board-certified doctors and primary care providers at our medical center and urgent care center.": "Servicios de salud integrales proporcionados por médicos certificados y proveedores de atención primaria en nuestro centro médico y centro de atención urgente.",
        "Explore Urgent Care": "Explorar Cuidado Urgente",
        "Explore Dermatology": "Explorar Dermatología",
        "Explore Occupational Health": "Explorar Salud Ocupacional",
        "Explore Acupuncture": "Explorar Acupuntura",
        "Explore Wellness": "Explorar Bienestar",
        "Explore Sports Medicine": "Explorar Medicina Deportiva",
        "WHO WE ARE": "QUIÉNES SOMOS",
        "About Our Medical Center": "Sobre Nuestro Centro Médico",
        "Learn More About Our Clinic": "Conozca Más Sobre Nuestra Clínica",
        "Insurance Information for Our Clinic": "Información de Seguros de Nuestra Clínica",
        "View All Accepted Insurance Plans at Our Medical Center": "Ver Todos los Planes de Seguro Aceptados",
        "Ready to Experience Quality Care at Our Medical Center?": "¿Listo Para Experimentar Atención de Calidad en Nuestro Centro Médico?",
        "Schedule Appointment at Our Clinic": "Programar Cita en Nuestra Clínica",

        // ── About page ──
        "About Montgomery Medical Clinic": "Sobre Montgomery Medical Clinic",
        "OUR MISSION": "NUESTRA MISIÓN",
        "A Legacy of Compassionate Care": "Un Legado de Atención Compasiva",
        "Meet Our Expert Providers": "Conozca a Nuestros Proveedores Expertos",
        "All Providers": "Todos los Proveedores",
        "Primary Care": "Atención Primaria",
        "Acupuncture": "Acupuntura",
        "Our Mission": "Nuestra Misión",
        "Personalized attention and continuity of care": "Atención personalizada y continuidad del cuidado",
        "Advanced treatments using the latest medical technology": "Tratamientos avanzados con la última tecnología médica",
        "Expert dermatology care for all your skin health needs": "Atención dermatológica experta para todas sus necesidades de salud cutánea",
        "A lasting relationship with trusted healthcare professionals": "Una relación duradera con profesionales de salud de confianza",
        "Convenient access to a full range of medical services": "Acceso conveniente a una gama completa de servicios médicos",
        "At Montgomery Medical Clinic, your health—and your confidence—are our top priorities.": "En Montgomery Medical Clinic, su salud y su confianza son nuestras principales prioridades.",
        "Medical Doctor": "Doctor en Medicina",
        "Physician Assistant": "Asistente Médico",
        "Family Medicine": "Medicina Familiar",
        "Internal Medicine": "Medicina Interna",
        "Schedule with": "Programar con",
        "OUR FACILITY": "NUESTRAS INSTALACIONES",
        "Comprehensive Care Under One Roof": "Atención Integral Bajo un Solo Techo",
        "In-House Radiology & X-Ray Services": "Radiología y Servicios de Rayos X en el Lugar",
        "Full-Service Physical Therapy": "Terapia Física de Servicio Completo",
        "Diagnostic Ultrasound": "Ultrasonido Diagnóstico",
        "On-Site Laboratory": "Laboratorio en el Lugar",
        "Your trusted healthcare partner.": "Su socio de confianza en atención médica.",

        // ── Dermatology page ──
        "Clinical Dermatology": "Dermatología Clínica",
        "Welcome to Our Clinical Dermatology Practice": "Bienvenido a Nuestra Práctica de Dermatología Clínica",
        "Our Clinical Dermatology Services": "Nuestros Servicios de Dermatología Clínica",
        "Our Clinical Dermatology Providers": "Nuestros Proveedores de Dermatología Clínica",
        "Ready for Expert Dermatology Care?": "¿Listo para Atención Dermatológica Experta?",
        "Overview": "Descripción General",
        "Providers": "Proveedores",
        "Acne": "Acné",
        "Eczema": "Eczema",
        "Psoriasis": "Psoriasis",
        "Rosacea": "Rosácea",
        "Skin Cancer": "Cáncer de Piel",
        "Dermatitis": "Dermatitis",
        "Warts": "Verrugas",
        "Hair Loss": "Pérdida de Cabello",
        "Skin Conditions": "Condiciones de la Piel",
        "Cosmetic Procedures": "Procedimientos Cosméticos",
        "Skin Cancer Screening": "Detección de Cáncer de Piel",
        "Medical Dermatology": "Dermatología Médica",
        "Medical Dermatology Services": "Servicios de Dermatología Médica",
        "Aesthetic Dermatology Services": "Servicios de Dermatología Estética",
        "Common Dermatology Conditions We Treat at Our Clinic": "Condiciones Dermatológicas Comunes que Tratamos en Nuestra Clínica",
        "Getting a Dermatology Diagnosis": "Obtener un Diagnóstico Dermatológico",
        "Early Detection": "Detección Temprana",
        "Saves Lives": "Salva Vidas",
        "Dermatology Skin Cancer Screenings & Prevention": "Detecciones y Prevención de Cáncer de Piel en Dermatología",
        "Mole Evaluation & Removal": "Evaluación y Eliminación de Lunares",
        "Dermatology Acne Treatment (All Ages)": "Tratamiento de Acné en Dermatología (Todas las Edades)",
        "Eczema & Psoriasis Management": "Manejo de Eczema y Psoriasis",
        "Rosacea Treatment": "Tratamiento de Rosácea",
        "Wart & Skin Tag Removal": "Eliminación de Verrugas y Fibromas",
        "Skin Infections & Rashes": "Infecciones y Erupciones de la Piel",
        "Hair Loss Evaluation & Treatment": "Evaluación y Tratamiento de Pérdida de Cabello",
        "Nail Disorder Treatment": "Tratamiento de Trastornos de Uñas",
        "Anti-Aging Treatments": "Tratamientos Antienvejecimiento",
        "Chemical Peels & Skin Rejuvenation": "Peelings Químicos y Rejuvenecimiento de la Piel",
        "Skin Biopsies": "Biopsias de Piel",
        "Cyst Removal": "Eliminación de Quistes",
        "Pediatric Dermatology": "Dermatología Pediátrica",
        "Botox Injections": "Inyecciones de Botox",
        "Dermal Fillers": "Rellenos Dérmicos",
        "Microneedling": "Microagujas",
        "VI Beam Laser": "Láser VI Beam",
        "Chemical Peels": "Peelings Químicos",
        "Skin Rejuvenation Treatments": "Tratamientos de Rejuvenecimiento de la Piel",
        "Board-Certified Dermatologist": "Dermatóloga Certificada",
        "Board-Certified Clinical Dermatologist": "Dermatóloga Clínica Certificada",
        "MD, Board Certified Dermatologist": "MD, Dermatóloga Certificada",
        "MD, MPH, Board Certified Dermatologist": "MD, MPH, Dermatóloga Certificada",

        // ── Dermatology page (exact HTML text) ──
        "Welcome to Our Dermatology Practice": "Bienvenido a Nuestra Práctica de Dermatología",
        "Comprehensive dermatology services for all your skin, hair, and nail concerns.":
            "Servicios integrales de dermatología para todas sus preocupaciones de piel, cabello y uñas.",
        "At Montgomery Medical Clinic, we offer comprehensive dermatology services. Whether you're concerned about acne, hair loss, or chronic skin disorders, our experts use the latest treatment techniques to address your needs.":
            "En Montgomery Medical Clinic, ofrecemos servicios integrales de dermatología. Ya sea que le preocupe el acné, la pérdida de cabello o los trastornos crónicos de la piel, nuestros expertos utilizan las últimas técnicas de tratamiento para atender sus necesidades.",
        "Getting a Diagnosis": "Obtener un Diagnóstico",
        "This year alone, thousands of people will be diagnosed with skin cancer. Early detection is essential for your skin and overall health. We provide comprehensive screenings to catch potential issues early.":
            "Solo este año, miles de personas serán diagnosticadas con cáncer de piel. La detección temprana es esencial para su piel y salud general. Proporcionamos exámenes integrales para detectar posibles problemas a tiempo.",
        "Our highly experienced dermatologists have extensive expertise in detecting and treating skin cancers before they spread.":
            "Nuestros dermatólogos con amplia experiencia tienen extensa pericia en la detección y tratamiento de cánceres de piel antes de que se propaguen.",
        "Our Dermatology Services": "Nuestros Servicios de Dermatología",
        "From medical treatments to aesthetic procedures, we offer complete skin care solutions":
            "Desde tratamientos médicos hasta procedimientos estéticos, ofrecemos soluciones completas de cuidado de la piel",
        "Common Conditions We Treat": "Condiciones Comunes que Tratamos",
        "Expert diagnosis and treatment for a wide range of skin conditions":
            "Diagnóstico experto y tratamiento para una amplia gama de condiciones de la piel",
        "Skin Cancer Screenings & Prevention": "Detección de Cáncer de Piel y Prevención",
        "Acne Treatment (All Ages)": "Tratamiento de Acné (Todas las Edades)",
        "Our Dermatology Providers": "Nuestros Proveedores de Dermatología",
        "Expert dermatology care from experienced, board-certified professionals.":
            "Atención dermatológica experta de profesionales experimentados y certificados.",
        "Common questions about our dermatology services in Gaithersburg, MD.":
            "Preguntas comunes sobre nuestros servicios de dermatología en Gaithersburg, MD.",
        "Do I need a referral to see a dermatologist at Montgomery Medical Clinic?":
            "¿Necesito una referencia para ver a un dermatólogo en Montgomery Medical Clinic?",
        "No referral is needed": "No se necesita referencia",
        "for most patients. You can schedule a dermatology appointment directly by calling":
            "para la mayoría de los pacientes. Puede programar una cita de dermatología directamente llamando al",
        "or booking online.": "o reservando en línea.",
        "booking online": "reservando en línea",
        "Some insurance plans may require a referral, so we recommend checking with your provider first.":
            "Algunos planes de seguro pueden requerir una referencia, por lo que recomendamos consultar primero con su proveedor.",
        "What skin conditions do you treat?": "¿Qué condiciones de la piel tratan?",
        "We treat a full range of": "Tratamos una gama completa de",
        "skin, hair, and nail conditions": "condiciones de piel, cabello y uñas",
        ", including:": ", incluyendo:",
        "including:": "incluyendo:",
        "Acne, eczema, psoriasis, and rosacea": "Acné, eczema, psoriasis y rosácea",
        "Hair loss and fungal infections": "Pérdida de cabello e infecciones fúngicas",
        "Warts, skin tags, and suspicious moles": "Verrugas, fibromas y lunares sospechosos",
        "Skin cancer screenings and biopsies": "Detecciones de cáncer de piel y biopsias",
        "Does Montgomery Medical Clinic offer skin cancer screenings?":
            "¿Montgomery Medical Clinic ofrece detecciones de cáncer de piel?",
        "Our dermatologists perform comprehensive full-body skin exams to check for melanoma and other skin cancers.":
            "Nuestros dermatólogos realizan exámenes integrales de piel de cuerpo completo para detectar melanoma y otros cánceres de piel.",
        "Early detection is critical": "La detección temprana es crítica",
        "we recommend": "recomendamos",
        "annual screenings": "exámenes anuales",
        "especially if you have a family history of skin cancer or a large number of moles.":
            "especialmente si tiene antecedentes familiares de cáncer de piel o una gran cantidad de lunares.",
        ", especially if you have a family history of skin cancer or a large number of moles.":
            ", especialmente si tiene antecedentes familiares de cáncer de piel o una gran cantidad de lunares.",
        "Do you offer cosmetic dermatology services?": "¿Ofrecen servicios de dermatología cosmética?",
        ", we offer cosmetic dermatology treatments.": ", ofrecemos tratamientos de dermatología cosmética.",
        "Contact our office at": "Comuníquese con nuestra oficina al",
        "for details about available cosmetic procedures and to schedule a consultation.":
            "para obtener detalles sobre los procedimientos cosméticos disponibles y programar una consulta.",
        "Does insurance cover dermatology visits?": "¿El seguro cubre las visitas de dermatología?",
        "Most medical dermatology visits are covered": "La mayoría de las visitas de dermatología médica están cubiertas",
        "by insurance. We accept Aetna, BlueCross BlueShield (CareFirst), Cigna, UnitedHealthcare, Medicare, Medicaid, and many more.":
            "por el seguro. Aceptamos Aetna, BlueCross BlueShield (CareFirst), Cigna, UnitedHealthcare, Medicare, Medicaid y muchos más.",
        "Cosmetic procedures are typically not covered. Call us to verify your specific plan.":
            "Los procedimientos cosméticos generalmente no están cubiertos. Llámenos para verificar su plan específico.",
        "Ready for Expert Skin Care?": "¿Listo para Atención Dermatológica Experta?",
        "Schedule your consultation with our experienced dermatologists today.":
            "Programe su consulta con nuestros dermatólogos experimentados hoy.",
        "Dr. Mitchum completed her Dermatology Residency with the National Capital Consortium and a Fellowship in Cutaneous Oncology at the Dana-Farber Cancer Institute and Brigham and Women's Hospital, Harvard University. She also worked as a Medical Officer in the Division of Oncology at the U.S. Food and Drug Administration, where she contributed to national cancer drug evaluation and clinical research oversight.":
            "La Dra. Mitchum completó su Residencia en Dermatología con el Consorcio de la Capital Nacional y una Beca en Oncología Cutánea en el Instituto de Cáncer Dana-Farber y el Hospital Brigham and Women's, Universidad de Harvard. También trabajó como Oficial Médica en la División de Oncología de la Administración de Alimentos y Medicamentos de los EE.UU., donde contribuyó a la evaluación nacional de medicamentos contra el cáncer y la supervisión de investigación clínica.",
        "Her clinical interests include general medical dermatology, skin cancer diagnosis and treatment, and complex skin disorders. At Montgomery Medical Clinic Dermatology, Dr. Mitchum is dedicated to providing evidence-based, compassionate care—combining her background in medicine, oncology, and aviation to deliver precise, patient-centered treatment.":
            "Sus intereses clínicos incluyen dermatología médica general, diagnóstico y tratamiento del cáncer de piel, y trastornos cutáneos complejos. En Montgomery Medical Clinic Dermatología, la Dra. Mitchum está dedicada a proporcionar atención basada en evidencia y compasiva, combinando su experiencia en medicina, oncología y aviación para brindar un tratamiento preciso y centrado en el paciente.",

        // ── Urgent & Primary Care page ──
        "Urgent Care Center & Primary Care": "Centro de Atención Urgente y Atención Primaria",
        "Comprehensive Urgent Care and Primary Care Services": "Servicios Integrales de Atención Urgente y Atención Primaria",
        "Our Primary Care Physicians and Primary Doctors": "Nuestros Médicos de Atención Primaria",
        "Ready to Get Started?": "¿Listo para Comenzar?",
        "Primary Care Physicians / Preventative Services": "Médicos de Atención Primaria / Servicios Preventivos",
        "Urgent Center & Urgent Care Services": "Centro Urgente y Servicios de Atención Urgente",
        "Chronic Disease Management": "Manejo de Enfermedades Crónicas",
        "Annual Physical Exams": "Exámenes Físicos Anuales",
        "Vaccinations": "Vacunas",
        "Preventive Care": "Atención Preventiva",
        "Lab Testing": "Pruebas de Laboratorio",
        "Minor Injuries": "Lesiones Menores",
        "Illness Treatment": "Tratamiento de Enfermedades",
        "No Appointment Needed": "Sin Cita Previa",
        "Walk-In Basis": "Atención sin Cita",
        "Most Insurance Accepted": "Se Acepta la Mayoría de Seguros",
        "We accept most major insurance plans.": "Aceptamos la mayoría de los principales planes de seguro.",
        "View accepted providers →": "Ver proveedores aceptados →",
        "On-Site X-Ray & Diagnostics": "Rayos X y Diagnósticos en el Lugar",
        "Advanced diagnostic tools and imaging services available right here in our clinic for immediate results.": "Herramientas de diagnóstico avanzadas y servicios de imágenes disponibles aquí mismo en nuestra clínica para resultados inmediatos.",
        "Routine physicals & wellness exams": "Exámenes físicos de rutina y exámenes de bienestar",
        "Routine vaccinations & immunizations": "Vacunas e inmunizaciones de rutina",
        "Blood pressure screening": "Detección de presión arterial",
        "Diagnostic testing & lab work": "Pruebas diagnósticas y trabajo de laboratorio",
        "Men's & women's health services": "Servicios de salud para hombres y mujeres",
        "STD testing & treatment": "Pruebas y tratamiento de ETS",
        "Well woman examinations": "Exámenes de bienestar femenino",
        "IUD placement & contraception": "Colocación de DIU y anticoncepción",
        "Pap smears & breast exams": "Papanicolaou y exámenes de mama",
        "Colds / Upper respiratory infections": "Resfriados / Infecciones respiratorias superiores",
        "Fever & sore throat": "Fiebre y dolor de garganta",
        "Influenza (flu) treatment": "Tratamiento de influenza (gripe)",
        "Asthma attacks & breathing issues": "Ataques de asma y problemas respiratorios",
        "Abdominal pain": "Dolor abdominal",
        "UTI & kidney infections": "Infecciones urinarias y renales",
        "Ear infections & earaches": "Infecciones de oído y dolores de oído",
        "Eye infections": "Infecciones oculares",
        "Rashes, hives & allergic reactions": "Erupciones, urticaria y reacciones alérgicas",
        "Hypertension (high blood pressure)": "Hipertensión (presión arterial alta)",
        "Diabetes management": "Manejo de diabetes",
        "Hyperlipidemia (high cholesterol)": "Hiperlipidemia (colesterol alto)",
        "Asthma/COPD treatment": "Tratamiento de asma/EPOC",
        "Arthritis & chronic pain": "Artritis y dolor crónico",
        "Depression & anxiety": "Depresión y ansiedad",
        "Migraine management": "Manejo de migrañas",
        "Weight loss & obesity management": "Control de pérdida de peso y obesidad",
        "MD, MPH - Primary Care Provider & Urgent Care Physician": "MD, MPH - Proveedor de Atención Primaria y Médico de Atención Urgente",
        "MD - Primary Care Provider": "MD - Proveedor de Atención Primaria",
        "DO, CAQSM - Primary Care Physician & Sports Medicine": "DO, CAQSM - Médico de Atención Primaria y Medicina Deportiva",
        "Board-Certified in Family & Sports Medicine": "Certificado en Medicina Familiar y Deportiva",

        // ── Insurance page ──
        "Insurance Information": "Información de Seguros",
        "Insurances We Accept": "Seguros que Aceptamos",
        "Commercial Plans": "Planes Comerciales",
        "State of Maryland Insurances": "Seguros del Estado de Maryland",
        "Other Plans": "Otros Planes",
        "Don't see your insurance?": "¿No ve su seguro?",
        "Contact us": "Contáctenos",
        "Contact Us": "Contáctenos",
        "to verify your coverage.": "para verificar su cobertura.",
        "Self Pay": "Pago Directo",

        // ── FAA Physicals page ──
        "FAA Physical Examinations": "Exámenes Físicos de la FAA",
        "What is an FAA Physical and who needs one?": "¿Qué es un Examen Físico de la FAA y quién lo necesita?",
        "Three Classes of FAA Physicals - We Offer All Classes": "Tres Clases de Exámenes Físicos de la FAA - Ofrecemos Todas las Clases",
        "How should I prepare for my FAA physical?": "¿Cómo debo prepararme para mi examen físico de la FAA?",
        "How often does my FAA physical need to be repeated?": "¿Con qué frecuencia necesito repetir mi examen físico de la FAA?",
        "Ready to Schedule Your FAA Physical?": "¿Listo para Programar Su Examen Físico de la FAA?",
        "Schedule Online": "Programar en Línea",
        "1st Class": "Clase 1",
        "2nd Class": "Clase 2",
        "3rd Class": "Clase 3",
        "Airline Transport Pilot": "Piloto de Transporte Aéreo",
        "Commercial Pilot": "Piloto Comercial",
        "Private Pilot": "Piloto Privado",
        "Serving Pilots in the DMV Area": "Sirviendo a Pilotos en el Área DMV",
        "Preparation": "Preparación",
        "Renewal": "Renovación",
        "Partnership": "Asociación",

        // ── Immigration Physicals page ──
        "Immigration Medical Examinations": "Exámenes Médicos de Inmigración",
        "What is an Immigration Physical and who needs one?": "¿Qué es un Examen Físico de Inmigración y quién lo necesita?",
        "Vaccination Requirements": "Requisitos de Vacunación",
        "What should I bring to my Immigration Physical?": "¿Qué debo llevar a mi Examen Físico de Inmigración?",
        "How long does it take to get the paperwork?": "¿Cuánto tiempo tarda en obtener el papeleo?",
        "Ready to Schedule Your Immigration Physical?": "¿Listo para Programar Su Examen Físico de Inmigración?",
        "View Vaccination Requirements": "Ver Requisitos de Vacunación",
        "Dr. Efi Kessous is an Authorized USCIS Physician": "El Dr. Efi Kessous es un Médico USCIS Autorizado",
        "A government issued ID, such as a driving license or passport": "Una identificación emitida por el gobierno, como una licencia de conducir o pasaporte",
        "A copy of your immunization records": "Una copia de sus registros de vacunación",

        // ── Occupational Health page ──
        "Occupational Health Services": "Servicios de Salud Ocupacional",
        "Ready to Schedule?": "¿Listo para Programar?",
        "Detailed Service Information": "Información Detallada del Servicio",
        "i693 USCIS Medical Exam": "Examen Médico i693 USCIS",
        "Corporate Occupational Health Services": "Servicios de Salud Ocupacional Corporativa",
        "MVA Physicals": "Exámenes Físicos MVA",
        "Book Online": "Reservar en Línea",
        "Drug Testing": "Pruebas de Drogas",
        "Pre-Employment Physicals": "Exámenes Físicos Previos al Empleo",
        "Workers Compensation": "Compensación de Trabajadores",
        "Workplace Injury": "Lesión en el Trabajo",
        "OSHA Compliance": "Cumplimiento de OSHA",
        "Pre-Employment Screening": "Detección Previa al Empleo",
        "On-Site Wellness Programs": "Programas de Bienestar en el Lugar",
        "Return-to-Work Evaluations": "Evaluaciones de Regreso al Trabajo",
        "Contact Us for Corporate Programs": "Contáctenos para Programas Corporativos",
        "i693 USCIS Medical Exam - Immigration Physical": "Examen Médico i693 USCIS - Examen Físico de Inmigración",
        "Dr. Efi Kessous - USCIS-Authorized for i693 & USCIS Medical Exam": "Dr. Efi Kessous - Autorizado por USCIS para i693 y Examen Médico USCIS",
        "Unsure of vaccination requirements?": "¿No está seguro de los requisitos de vacunación?",
        "View CDC Guidelines": "Ver Pautas del CDC",
        "MVA Physicals for DUI": "Exámenes Físicos MVA para DUI",
        "Licensed physician examinations for DUI requirements": "Exámenes de médico licenciado para requisitos de DUI",
        "Corporate Wellness": "Bienestar Corporativo",
        "FAA Physicals": "Exámenes Físicos de la FAA",

        // ── Five Elements Acupuncture page ──
        "Five Elements Acupuncture & Wellness": "Acupuntura y Bienestar Cinco Elementos",
        "What is Acupuncture?": "¿Qué es la Acupuntura?",
        "Five Elements Acupuncture Wellness Philosophy": "Filosofía de Bienestar de Acupuntura Cinco Elementos",
        "Experience Personalized Acupuncture Care": "Experimente Atención de Acupuntura Personalizada",
        "Five Elements Acupuncture Services & Traditional Chinese Medicine": "Servicios de Acupuntura Cinco Elementos y Medicina Tradicional China",
        "Acupuncture Therapy": "Terapia de Acupuntura",
        "Stress Management & Emotional Wellness": "Manejo del Estrés y Bienestar Emocional",
        "Insomnia": "Insomnio",
        "Cupping Therapy": "Terapia de Ventosas",
        "Moxibustion": "Moxibustión",
        "Fertility": "Fertilidad",
        "Conditions We Treat": "Condiciones que Tratamos",
        "Experience High-Quality Holistic Acupuncture Care": "Experimente Atención de Acupuntura Holística de Alta Calidad",
        "Personalized Acupuncture Care Journey": "Viaje de Atención de Acupuntura Personalizado",
        "Comprehensive Consultation": "Consulta Integral",
        "Targeted Acupuncture Therapy": "Terapia de Acupuntura Dirigida",
        "Integrative Support": "Apoyo Integrativo",
        "Ongoing Wellness Planning": "Planificación Continua del Bienestar",
        "Insurance & Payment Options": "Opciones de Seguro y Pago",
        "Preparing for Your Acupuncture Treatment": "Preparándose para Su Tratamiento de Acupuntura",
        "Before Your Session": "Antes de Su Sesión",
        "During Treatment": "Durante el Tratamiento",
        "Aftercare Tips": "Consejos de Cuidado Posterior",
        "Ready to Begin Your Acupuncture Healing Journey?": "¿Listo para Comenzar Su Viaje de Curación de Acupuntura?",
        "Care Journey": "Viaje de Atención",
        "General Health Conditions": "Condiciones de Salud General",
        "Licensed acupuncture, Chinese medicine, and pain management in Gaithersburg, MD.":
            "Acupuntura licenciada, medicina china y manejo del dolor en Gaithersburg, MD.",
        "Welcome To Five Elements Acupuncture & Wellness": "Bienvenido a Acupuntura y Bienestar Cinco Elementos",
        "Experience the healing power of traditional Chinese medicine combined with modern functional health care. Dr. Min Lu provides personalized":
            "Experimente el poder curativo de la medicina tradicional china combinada con la atención funcional moderna de la salud. La Dra. Min Lu proporciona",
        "treatments and holistic wellness solutions to help you achieve optimal health.":
            "tratamientos personalizados y soluciones de bienestar holístico para ayudarle a lograr una salud óptima.",
        "Meet Dr. Min Lu | 路敏医师简介": "Conozca a la Dra. Min Lu | 路敏医师简介",
        "Dr. Min Lu is a licensed acupuncturist dedicated to providing exceptional":
            "La Dra. Min Lu es una acupunturista licenciada dedicada a proporcionar excepcional atención de",
        "care tailored to your unique health needs, integrating traditional Chinese medicine with modern biomedical knowledge.":
            "adaptada a sus necesidades únicas de salud, integrando la medicina tradicional china con el conocimiento biomédico moderno.",
        "Dr. Min Lu, L.Ac., DAOM (candidate)": "Dra. Min Lu, L.Ac., DAOM (candidata)",
        "Licensed Acupuncturist | Doctor of Acupuncture and Oriental Medicine (DAOM) in progress":
            "Acupunturista Licenciada | Doctora en Acupuntura y Medicina Oriental (DAOM) en progreso",
        "Dr. Min Lu, a licensed acupuncturist in the State of Maryland, is currently pursuing her Doctor of Acupuncture and Oriental Medicine (DAOM) degree. She began to devote herself to acupuncture and integrative healing during the 2008 Olympic Games, when she witnessed the growing need for effective pain management—not only for athletes but also for the general public.":
            "La Dra. Min Lu, una acupunturista licenciada en el Estado de Maryland, está cursando actualmente su Doctorado en Acupuntura y Medicina Oriental (DAOM). Comenzó a dedicarse a la acupuntura y a la curación integrativa durante los Juegos Olímpicos de 2008, cuando fue testigo de la creciente necesidad de un manejo eficaz del dolor, no solo para los atletas sino también para el público en general.",
        "She has extensive clinical experience in both China and the United States, and possesses a deep understanding of Traditional Chinese Medicine (TCM) philosophy, including the principles of Yin and Yang, Five Elements, and the regulation of Qi, Blood, Jing, and Shen. In her clinical work, Dr. Lu integrates these classical theories with modern biomedical knowledge, including anatomy, physiology, and pathology, to provide safe and effective evidence-based care.":
            "Tiene una amplia experiencia clínica tanto en China como en los Estados Unidos, y posee un profundo conocimiento de la filosofía de la Medicina Tradicional China (MTC), incluyendo los principios del Yin y Yang, los Cinco Elementos, y la regulación del Qi, Sangre, Jing y Shen. En su trabajo clínico, la Dra. Lu integra estas teorías clásicas con el conocimiento biomédico moderno, incluyendo anatomía, fisiología y patología, para brindar atención segura y efectiva basada en la evidencia.",
        "Dr. Lu studied under Professor Biqin Wang, a renowned TCM gynecologist in Beijing, and Professor Guo Zhiqiang, a distinguished national TCM master. During her professional development in the United States, she also apprenticed with Professor Guoping Zheng, the North American inheritor of the Lingnan Luo's Gynecology School. Drawing upon her mentors' academic philosophy of \"treating the Kidney as the root,\" Dr. Lu applies the menstrual cycle regulation method (Tiao Zhou Fa) to infertility and reproductive health, achieving remarkable clinical outcomes in treating infertility, ovarian dysfunction, and menstrual disorders.":
            "La Dra. Lu estudió con el Profesor Biqin Wang, un renombrado ginecólogo de MTC en Beijing, y con el Profesor Guo Zhiqiang, un distinguido maestro nacional de MTC. Durante su desarrollo profesional en los Estados Unidos, también fue aprendiz del Profesor Guoping Zheng, el heredero norteamericano de la Escuela de Ginecología Lingnan Luo. Basándose en la filosofía académica de sus mentores de \"tratar el Riñón como la raíz,\" la Dra. Lu aplica el método de regulación del ciclo menstrual (Tiao Zhou Fa) a la infertilidad y la salud reproductiva, logrando notables resultados clínicos en el tratamiento de la infertilidad, disfunción ovárica y trastornos menstruales.",
        "Professional Positions & Memberships": "Cargos Profesionales y Membresías",
        "Board Member & Deputy Director of Academic Affairs, Youth Committee of the American Traditional Chinese Medicine Association (ATCMA-USA)":
            "Miembro de la Junta y Subdirectora de Asuntos Académicos, Comité Juvenil de la Asociación Americana de Medicina Tradicional China (ATCMA-USA)",
        "Council Member, Scalp Acupuncture Specialty Committee, World Federation of Chinese Medicine Societies (WFCMS)":
            "Miembro del Consejo, Comité de Especialidad de Acupuntura del Cuero Cabelludo, Federación Mundial de Sociedades de Medicina China (WFCMS)",
        "Member, American Traditional Chinese Medicine Association (ATCMA)":
            "Miembro, Asociación Americana de Medicina Tradicional China (ATCMA)",
        "Member, American Society of Chinese Medicine & Acupuncture (ASCMA)":
            "Miembro, Sociedad Americana de Medicina China y Acupuntura (ASCMA)",
        "Member, ATCMA Gynecology Academic Committee":
            "Miembro, Comité Académico de Ginecología de ATCMA",
        "Member, Global Dynamic Needling Association":
            "Miembro, Asociación Global de Agujas Dinámicas",
        "Apprentice Physician, First Inheritance Program under Master Dr. Guo Zhiqiang":
            "Médica Aprendiz, Primer Programa de Herencia bajo el Maestro Dr. Guo Zhiqiang",
        "Certifications": "Certificaciones",
        "NCCAOM Clean Needle Technique (CNT) Certification":
            "Certificación NCCAOM de Técnica de Aguja Limpia (CNT)",
        "CPR Certification": "Certificación CPR",
        "Areas of Specialization": "Áreas de Especialización",
        "Women's health, fertility support, infertility treatment, ovarian dysfunction, PCOS (Polycystic Ovary Syndrome), menstrual disorders, menopausal syndrome, pelvic inflammatory disease, vulva leukoplakia, postnatal care, pain management, and holistic wellness.":
            "Salud de la mujer, apoyo a la fertilidad, tratamiento de la infertilidad, disfunción ovárica, SOP (Síndrome de Ovario Poliquístico), trastornos menstruales, síndrome menopáusico, enfermedad inflamatoria pélvica, leucoplaquia de la vulva, cuidado postnatal, manejo del dolor y bienestar holístico.",
        "\"The essence of medicine is not only to treat illness, but to awaken the body's own power to heal and harmonize.\"":
            "\"La esencia de la medicina no es solo tratar la enfermedad, sino despertar el propio poder del cuerpo para curarse y armonizarse.\"",
        "— Dr. Min Lu": "— Dra. Min Lu",
        "View Chinese Version / 中文简介": "Ver Versión China / 中文简介",
        "Our Acupuncture Services": "Nuestros Servicios de Acupuntura",
        "At Five Elements Acupuncture & Wellness, Dr. Lu provides a wide range of":
            "En Acupuntura y Bienestar Cinco Elementos, la Dra. Lu proporciona una amplia gama de",
        "and Chinese medicine services, including cupping therapy, moxibustion, massage therapy, and stress management to help you achieve optimal wellness.":
            "y servicios de medicina china, incluyendo terapia de ventosas, moxibustión, masoterapia y manejo del estrés para ayudarle a lograr el bienestar óptimo.",
        "Pain Management": "Manejo del Dolor",
        "Acupuncture therapy for chronic and acute pain relief":
            "Terapia de acupuntura para alivio del dolor crónico y agudo",
        "Massage Therapy": "Masoterapia",
        "Therapeutic massage for relaxation and pain relief":
            "Masaje terapéutico para relajación y alivio del dolor",
        "Stress Management": "Manejo del Estrés",
        "Acupuncture and holistic approaches to reduce stress":
            "Acupuntura y enfoques holísticos para reducir el estrés",
        "Digestive Health": "Salud Digestiva",
        "Dr. Lu provides specialized care for a wide range of conditions, combining traditional Chinese medicine with modern functional health practices.":
            "La Dra. Lu proporciona atención especializada para una amplia gama de condiciones, combinando la medicina tradicional china con las prácticas modernas de salud funcional.",
        "Women's Health": "Salud de la Mujer",
        "Infertility & Ovarian Dysfunction": "Infertilidad y Disfunción Ovárica",
        "Polycystic Ovary Syndrome (PCOS)": "Síndrome de Ovario Poliquístico (SOP)",
        "Menstrual Disease & Irregular Periods": "Enfermedad Menstrual y Períodos Irregulares",
        "Menopausal Syndrome": "Síndrome Menopáusico",
        "Pelvic Inflammatory Disease": "Enfermedad Inflamatoria Pélvica",
        "Vulva Leukoplakia": "Leucoplaquia de la Vulva",
        "Postnatal Care": "Cuidado Postnatal",
        "Depression & Anxiety": "Depresión y Ansiedad",
        "Insomnia & Sleep Disorders": "Insomnio y Trastornos del Sueño",
        "Allergies & Respiratory Issues": "Alergias y Problemas Respiratorios",
        "Pain Management (Chronic & Acute)": "Manejo del Dolor (Crónico y Agudo)",
        "Digestive Disorders": "Trastornos Digestivos",
        "Stress & Fatigue": "Estrés y Fatiga",
        "To receive high-quality holistic health care in a warm and welcoming environment, partner with Dr. Lu. Make an appointment at Five Elements Acupuncture & Wellness for professional":
            "Para recibir atención médica holística de alta calidad en un entorno cálido y acogedor, asóciese con la Dra. Lu. Haga una cita en Acupuntura y Bienestar Cinco Elementos para un profesional tratamiento de",
        "treatment by calling the office or booking online today.":
            "llamando a la oficina o reservando en línea hoy.",
        "WE ACCEPT MOST INSURANCE PROVIDERS": "ACEPTAMOS LA MAYORÍA DE LOS PROVEEDORES DE SEGUROS",
        "We also accept auto and personal injury insurance for":
            "También aceptamos seguros de automóvil y por lesiones personales para",
        "treatments.": "tratamientos.",
        "Common questions about acupuncture at Montgomery Medical Clinic.":
            "Preguntas comunes sobre la acupuntura en Montgomery Medical Clinic.",
        "What conditions can acupuncture treat?": "¿Qué condiciones puede tratar la acupuntura?",
        "Acupuncture is recognized by the": "La acupuntura es reconocida por la",
        "as an effective treatment for a wide range of conditions, including:":
            "como un tratamiento eficaz para una amplia gama de condiciones, que incluyen:",
        "World Health Organization (WHO)": "Organización Mundial de la Salud (OMS)",
        "National Institutes of Health (NIH)": "Institutos Nacionales de Salud (NIH)",
        "Pain management": "Manejo del dolor",
        "— chronic pain, migraines, tension headaches, sciatica, back pain, neck pain, and shoulder pain":
            "— dolor crónico, migrañas, cefaleas tensionales, ciática, dolor de espalda, dolor de cuello y dolor de hombro",
        "Musculoskeletal": "Musculoesquelético",
        "— arthritis, joint stiffness, fibromyalgia, carpal tunnel syndrome, and sports injuries":
            "— artritis, rigidez articular, fibromialgia, síndrome del túnel carpiano y lesiones deportivas",
        "Mental health": "Salud mental",
        "— stress, anxiety, depression, PTSD, and insomnia":
            "— estrés, ansiedad, depresión, TEPT e insomnio",
        "Digestive health": "Salud digestiva",
        "— IBS, acid reflux, nausea, bloating, and appetite regulation":
            "— SII, reflujo ácido, náuseas, hinchazón y regulación del apetito",
        "Women\u2019s health": "Salud de la mujer",
        "— fertility support, menstrual irregularities, menopause symptoms, and pregnancy-related discomfort":
            "— apoyo a la fertilidad, irregularidades menstruales, síntomas de la menopausia y molestias relacionadas con el embarazo",
        "Respiratory & allergies": "Respiratorio y alergias",
        "— seasonal allergies, sinusitis, and asthma support":
            "— alergias estacionales, sinusitis y apoyo para el asma",
        "During your first visit, Dr. Min Lu will perform a comprehensive evaluation and create a":
            "Durante su primera visita, la Dra. Min Lu realizará una evaluación integral y creará un",
        "personalized treatment plan": "plan de tratamiento personalizado",
        "tailored to your specific health goals.": "adaptado a sus objetivos de salud específicos.",
        "Does acupuncture hurt?": "¿Duele la acupuntura?",
        "Most patients feel little to no pain.": "La mayoría de los pacientes sienten poco o ningún dolor.",
        "Acupuncture needles are hair-thin — about 0.2 mm in diameter, which is 25–50 times thinner than a standard hypodermic needle used for injections or blood draws.":
            "Las agujas de acupuntura son finas como un cabello, de aproximadamente 0,2 mm de diámetro, 25 a 50 veces más delgadas que una aguja hipodérmica estándar utilizada para inyecciones o extracciones de sangre.",
        "You may feel a slight tingling, warmth, or mild pressure at the insertion point — this is known as":
            "Es posible que sienta un leve hormigueo, calor o una ligera presión en el punto de inserción — esto se conoce como",
        "a sign that the treatment is activating your body's natural healing response. Many patients find the sessions so relaxing that they fall asleep during treatment.":
            "una señal de que el tratamiento está activando la respuesta curativa natural de su cuerpo. Muchos pacientes encuentran las sesiones tan relajantes que se quedan dormidos durante el tratamiento.",
        "Dr. Min Lu uses gentle, precise needle techniques refined over years of clinical practice to ensure your comfort throughout every session.":
            "La Dra. Min Lu utiliza técnicas de aguja suaves y precisas perfeccionadas a lo largo de años de práctica clínica para garantizar su comodidad durante cada sesión.",
        "Do I need an appointment, or do you accept walk-ins?":
            "¿Necesito una cita o aceptan pacientes sin cita?",
        "Both!": "¡Ambos!",
        "Montgomery Medical Clinic accepts walk-ins": "Montgomery Medical Clinic acepta pacientes sin cita",
        "7 days a week": "7 días a la semana",
        "and also offers scheduled appointments for your convenience.":
            "y también ofrece citas programadas para su comodidad.",
        "Walk-ins welcome": "Sin cita bienvenidos",
        "— seen on a first-come, first-served basis during regular clinic hours":
            "— atendidos por orden de llegada durante el horario regular de la clínica",
        "Same-day appointments": "Citas el mismo día",
        "— book online for the shortest wait time":
            "— reserve en línea para el tiempo de espera más corto",
        "Scheduled appointments": "Citas programadas",
        "— reserve your preferred date and time in advance":
            "— reserve su fecha y hora preferida con anticipación",
        "For the fastest service, we recommend booking a same-day appointment online or calling us at":
            "Para un servicio más rápido, recomendamos reservar una cita el mismo día en línea o llamarnos al",
        ". Our clinic is conveniently located in Gaithersburg, MD and serves patients throughout Montgomery County.":
            ". Nuestra clínica está convenientemente ubicada en Gaithersburg, MD y sirve a pacientes en todo el Condado de Montgomery.",
        "and serves patients throughout Montgomery County.":
            "y sirve a pacientes en todo el Condado de Montgomery.",
        "Does insurance cover acupuncture?": "¿El seguro cubre la acupuntura?",
        "Many insurance plans now provide coverage for acupuncture, especially following":
            "Muchos planes de seguro ahora ofrecen cobertura para la acupuntura, especialmente después de",
        "Medicare's 2020 decision": "la decisión de 2020 de Medicare",
        "to cover acupuncture for chronic low back pain. Private insurers including Aetna, Blue Cross Blue Shield, Cigna, and UnitedHealthcare increasingly cover acupuncture benefits as well.":
            "de cubrir la acupuntura para el dolor lumbar crónico. Las aseguradoras privadas, incluyendo Aetna, Blue Cross Blue Shield, Cigna y UnitedHealthcare, también cubren cada vez más los beneficios de la acupuntura.",
        "Coverage details vary by provider and plan, so we recommend verifying your benefits before your first visit. Our front desk team is happy to help — call":
            "Los detalles de la cobertura varían según el proveedor y el plan, por lo que recomendamos verificar sus beneficios antes de su primera visita. Nuestro equipo de recepción está encantado de ayudar — llame al",
        "and we can assist with insurance questions and out-of-pocket cost estimates.":
            "y podemos ayudarle con preguntas sobre el seguro y estimaciones de costos directos.",
        "How many acupuncture sessions will I need?":
            "¿Cuántas sesiones de acupuntura necesitaré?",
        "The number of sessions depends on your condition, its severity, and how your body responds to treatment:":
            "El número de sesiones depende de su condición, su gravedad y cómo responda su cuerpo al tratamiento:",
        "Acute issues": "Problemas agudos",
        "(recent injuries, headaches, muscle tension) — may improve noticeably in 3–5 sessions":
            "(lesiones recientes, dolores de cabeza, tensión muscular) — pueden mejorar notablemente en 3 a 5 sesiones",
        "Chronic conditions": "Condiciones crónicas",
        "(long-term pain, digestive disorders, anxiety) — typically benefit from 8–12 sessions":
            "(dolor a largo plazo, trastornos digestivos, ansiedad) — típicamente se benefician de 8 a 12 sesiones",
        "Wellness maintenance": "Mantenimiento del bienestar",
        "(stress relief, immune support, preventive care) — monthly or bi-monthly sessions recommended":
            "(alivio del estrés, apoyo inmunológico, atención preventiva) — se recomiendan sesiones mensuales o bimestrales",
        "Many patients report feeling improvement after their very first session. Dr. Min Lu will create a personalized treatment schedule during your initial consultation and adjust it as your condition progresses.":
            "Muchos pacientes informan sentir mejoría después de su primera sesión. La Dra. Min Lu creará un calendario de tratamiento personalizado durante su consulta inicial y lo ajustará a medida que su condición progrese.",
        "What other services does Five Elements Acupuncture offer besides needling?":
            "¿Qué otros servicios ofrece Acupuntura Cinco Elementos además de las agujas?",
        "Five Elements Acupuncture at Montgomery Medical Clinic offers a full range of":
            "Acupuntura Cinco Elementos en Montgomery Medical Clinic ofrece una gama completa de",
        "traditional Chinese medicine (TCM)": "medicina tradicional china (MTC)",
        "therapies, including:": "terapias, que incluyen:",
        "Cupping therapy": "Terapia de ventosas",
        "— uses suction cups to relieve muscle tension, improve blood flow, and reduce inflammation":
            "— utiliza ventosas de succión para aliviar la tensión muscular, mejorar el flujo sanguíneo y reducir la inflamación",
        "— a warming technique that stimulates acupuncture points to boost circulation and immunity":
            "— una técnica de calentamiento que estimula los puntos de acupuntura para impulsar la circulación y la inmunidad",
        "Herbal medicine consultations": "Consultas de medicina herbal",
        "— custom herbal formulas prescribed to complement your acupuncture treatments":
            "— fórmulas herbales personalizadas recetadas para complementar sus tratamientos de acupuntura",
        "Fertility acupuncture": "Acupuntura para la fertilidad",
        "— specialized protocols to support natural conception and IVF treatments":
            "— protocolos especializados para apoyar la concepción natural y los tratamientos de FIV",
        "Electroacupuncture": "Electroacupuntura",
        "— gentle electrical stimulation paired with needles for enhanced pain relief and nerve regeneration":
            "— estimulación eléctrica suave combinada con agujas para un mayor alivio del dolor y regeneración nerviosa",
        "Dr. Min Lu may combine multiple modalities in a single session for a comprehensive, holistic treatment approach tailored to your needs.":
            "La Dra. Min Lu puede combinar múltiples modalidades en una sola sesión para un enfoque de tratamiento integral y holístico adaptado a sus necesidades.",
        "Schedule your": "Programe su",
        "consultation with Dr. Min Lu today and experience the benefits of traditional Chinese medicine and professional":
            "consulta con la Dra. Min Lu hoy y experimente los beneficios de la medicina tradicional china y la profesional",
        "care in Gaithersburg, MD.": "atención en Gaithersburg, MD.",
        "Book Online": "Reservar en Línea",

        // ── Nutrition & Wellness page ──
        "A holistic approach to your health — combining personalized nutrition counseling and guided fitness training to help you feel stronger, more energized, and in control of your well-being.":
            "Un enfoque holístico para su salud — combinando asesoramiento nutricional personalizado y entrenamiento físico guiado para ayudarle a sentirse más fuerte, con más energía y en control de su bienestar.",
        "We combine expert nutrition guidance with personalized fitness training to optimize your well-being. Whether you're managing a health condition or looking to improve your overall wellness, our integrated programs are designed to help you succeed.":
            "Combinamos orientación experta en nutrición con entrenamiento físico personalizado para optimizar su bienestar. Ya sea que esté manejando una condición de salud o buscando mejorar su bienestar general, nuestros programas integrados están diseñados para ayudarle a tener éxito.",
        "We combine nutrition and fitness to support your optimal health and wellness.":
            "Combinamos nutrición y ejercicio para apoyar su óptima salud y bienestar.",
        "Evidence-based nutrition counseling tailored to your health goals and medical needs.":
            "Asesoramiento nutricional basado en evidencia adaptado a sus objetivos de salud y necesidades médicas.",
        "Customized fitness programs designed to help you build strength, improve performance, and reach your goals.":
            "Programas de ejercicio personalizados diseñados para ayudarle a desarrollar fuerza, mejorar el rendimiento y alcanzar sus objetivos.",
        "Our nutritionist works alongside your physician to help patients — whether overweight, underweight, or managing a medical condition — build healthier habits and sustainable plans for long-term well-being.":
            "Nuestra nutricionista trabaja junto a su médico para ayudar a los pacientes — ya sea con sobrepeso, bajo peso o que manejan una condición médica — a construir hábitos más saludables y planes sostenibles para el bienestar a largo plazo.",
        "Our personal trainers work closely with each patient to understand their goals, assess physical limitations, and build safe, effective programs that strengthen the body while preventing injury.":
            "Nuestros entrenadores personales trabajan estrechamente con cada paciente para comprender sus objetivos, evaluar las limitaciones físicas y crear programas seguros y efectivos que fortalecen el cuerpo y previenen lesiones.",
        "When your meal plan and training program are designed as one, every part of your care reinforces the other.":
            "Cuando su plan de alimentación y su programa de entrenamiento se diseñan como uno solo, cada parte de su atención refuerza a la otra.",
        "Why nutrition and fitness belong together": "Por qué la nutrición y el ejercicio van juntos",
        "Your nutritionist and trainer collaborate together, so your diet fuels your workouts and your workouts reinforce your nutrition goals.":
            "Su nutricionista y entrenador colaboran juntos, para que su dieta alimente sus entrenamientos y sus entrenamientos refuercen sus objetivos nutricionales.",
        "Pairing guided exercise with a structured meal plan accelerates progress — whether you're losing weight, managing a condition, or building strength.":
            "Combinar el ejercicio guiado con un plan de comidas estructurado acelera el progreso — ya sea que esté perdiendo peso, manejando una condición o desarrollando fuerza.",
        "Every wellness program is backed by the clinical team at Montgomery Medical Clinic, so your training and nutrition stay aligned with your medical care.":
            "Cada programa de bienestar está respaldado por el equipo clínico en Montgomery Medical Clinic, por lo que su entrenamiento y nutrición se mantienen alineados con su atención médica.",
        "A physician-supervised weight loss program that combines weekly clinical visits, personalized nutrition coaching, and FDA-approved GLP-1 medications for safe, lasting results.":
            "Un programa de pérdida de peso supervisado por médicos que combina visitas clínicas semanales, asesoramiento nutricional personalizado y medicamentos GLP-1 aprobados por la FDA para resultados seguros y duraderos.",
        "Sustainable weight loss requires more than medication alone. Our program pairs GLP-1 therapy with the hands-on guidance of your nutritionist and physician — so every pound you lose stays off.":
            "La pérdida de peso sostenible requiere más que solo medicamentos. Nuestro programa combina la terapia GLP-1 con la guía práctica de su nutricionista y médico — para que cada libra que pierda se quede fuera.",
        "Visit the clinic each week to meet with your nutritionist and review your progress, habits, and goals.":
            "Visite la clínica cada semana para reunirse con su nutricionista y revisar su progreso, hábitos y objetivos.",
        "Your doctor monitors your health, adjusts medication dosing, and ensures the plan is safe and effective.":
            "Su médico monitorea su salud, ajusta la dosificación del medicamento y garantiza que el plan sea seguro y efectivo.",
        "Receive updated meal plans, lifestyle coaching, and accountability to keep you on track week after week.":
            "Reciba planes de comidas actualizados, asesoramiento sobre el estilo de vida y responsabilidad para mantenerlo en el camino correcto semana tras semana.",
        "GLP-1 receptor agonists, including":
            "Los agonistas del receptor GLP-1, incluyendo",
        ", are FDA-approved medications clinically proven to support significant weight loss by reducing appetite and improving metabolic health. When combined with nutrition counseling and regular physician oversight, patients achieve better and more sustainable outcomes than with medication or lifestyle changes alone.":
            ", son medicamentos aprobados por la FDA clínicamente probados para apoyar una pérdida de peso significativa al reducir el apetito y mejorar la salud metabólica. Cuando se combinan con asesoramiento nutricional y supervisión médica regular, los pacientes logran mejores resultados y más sostenibles que con medicamentos o cambios en el estilo de vida solos.",
        "We prescribe and dispense these medications directly at our clinic, making it easy and convenient for you to stay on your treatment plan.":
            "Recetamos y dispensamos estos medicamentos directamente en nuestra clínica, lo que le facilita y le conviene mantenerse en su plan de tratamiento.",
        "The most effective approach to weight loss combines medical treatment with professional guidance. Working alongside your nutritionist and doctor each week gives you the accountability, clinical oversight, and personalized adjustments that medication alone cannot provide — helping you build habits that last well beyond the program.":
            "El enfoque más efectivo para la pérdida de peso combina el tratamiento médico con la orientación profesional. Trabajar junto a su nutricionista y médico cada semana le brinda la responsabilidad, la supervisión clínica y los ajustes personalizados que los medicamentos por sí solos no pueden proporcionar — ayudándole a construir hábitos que duran mucho más allá del programa.",
        "Our nutrition and fitness professionals collaborate with the clinical team to deliver practical guidance, approachable coaching, and the accountability you need to live well.":
            "Nuestros profesionales de nutrición y ejercicio colaboran con el equipo clínico para brindar orientación práctica, asesoramiento accesible y la responsabilidad que necesita para vivir bien.",
        "Hodaya partners with patients to translate medical recommendations into real-world nutrition habits. She focuses on sustainable meal planning, mindful eating strategies, and building confidence in the kitchen so every client can make consistent, nourishing choices.":
            "Hodaya se asocia con los pacientes para traducir las recomendaciones médicas en hábitos de nutrición del mundo real. Se centra en la planificación de comidas sostenibles, estrategias de alimentación consciente y desarrollo de la confianza en la cocina para que cada cliente pueda tomar decisiones consistentes y nutritivas.",
        "Kevin designs individualized training programs that improve strength, mobility, and overall stamina. He blends functional movement with steady coaching support, helping each person stay motivated, recover safely, and celebrate measurable progress.":
            "Kevin diseña programas de entrenamiento individualizados que mejoran la fuerza, la movilidad y la resistencia general. Combina el movimiento funcional con un apoyo de entrenamiento constante, ayudando a cada persona a mantenerse motivada, recuperarse de manera segura y celebrar el progreso medible.",
        "Common questions about our nutrition and wellness programs.":
            "Preguntas comunes sobre nuestros programas de nutrición y bienestar.",
        "Our Wellness Center offers a range of services, including:":
            "Nuestro Centro de Bienestar ofrece una variedad de servicios, incluyendo:",
        "Nutrition counseling and personalized meal planning":
            "Asesoramiento nutricional y planificación de comidas personalizada",
        "Personal training programs": "Programas de entrenamiento personal",
        "Weight management programs": "Programas de control de peso",
        "Holistic health consultations": "Consultas de salud holística",
        "We combine functional medicine with customized plans for":
            "Combinamos la medicina funcional con planes personalizados para",
        "whole-body wellness": "bienestar integral",
        "No referral is needed.": "No se necesita referencia.",
        "You can schedule a nutrition consultation directly by calling":
            "Puede programar una consulta nutricional directamente llamando al",
        "or booking online.": "o reservando en línea.",
        "Our team will work with you to create a personalized plan based on your health goals.":
            "Nuestro equipo trabajará con usted para crear un plan personalizado basado en sus objetivos de salud.",
        "Coverage varies by plan.": "La cobertura varía según el plan.",
        "Some insurance plans cover nutrition counseling for medical conditions such as diabetes or obesity.":
            "Algunos planes de seguro cubren el asesoramiento nutricional para condiciones médicas como diabetes u obesidad.",
        "Personal training and general wellness programs are typically self-pay. Call us to check your specific coverage.":
            "El entrenamiento personal y los programas generales de bienestar generalmente son de pago propio. Llámenos para verificar su cobertura específica.",
        "Absolutely.": "Por supuesto.",
        "Because our Wellness Center is part of Montgomery Medical Clinic, we can coordinate your nutrition plan with your primary care provider, dermatologist, or other specialists — all":
            "Debido a que nuestro Centro de Bienestar es parte de Montgomery Medical Clinic, podemos coordinar su plan de nutrición con su proveedor de atención primaria, dermatólogo u otros especialistas — todo",
        "under one roof": "bajo un mismo techo",
        "This integrated approach means your whole care team is on the same page.":
            "Este enfoque integrado significa que todo su equipo de atención está en la misma página.",
        "Yes!": "¡Sí!",
        "We have a certified personal trainer who designs individualized programs to improve strength, mobility, and stamina.":
            "Tenemos un entrenador personal certificado que diseña programas individualizados para mejorar la fuerza, la movilidad y la resistencia.",
        "Training can be paired with nutrition counseling for a comprehensive wellness plan.":
            "El entrenamiento se puede combinar con el asesoramiento nutricional para un plan de bienestar integral.",
        "What is the Medical Weight Management Program?":
            "¿Qué es el Programa Médico de Control de Peso?",
        "is a physician-supervised weight loss program that combines weekly in-clinic visits with your nutritionist and doctor, personalized meal plans, lifestyle coaching, and FDA-approved GLP-1 medications such as semaglutide.":
            "es un programa de pérdida de peso supervisado por médicos que combina visitas semanales en la clínica con su nutricionista y médico, planes de comidas personalizados, asesoramiento sobre el estilo de vida y medicamentos GLP-1 aprobados por la FDA como semaglutida.",
        "Each week you meet with your care team to review progress, adjust your plan, and ensure you are on the safest and most effective path to your weight loss goals.":
            "Cada semana se reúne con su equipo de atención para revisar el progreso, ajustar su plan y garantizar que esté en el camino más seguro y eficaz hacia sus objetivos de pérdida de peso.",
        "Do you prescribe GLP-1 or semaglutide medications for weight loss?":
            "¿Receta medicamentos GLP-1 o semaglutida para la pérdida de peso?",
        "Yes.": "Sí.",
        "As part of our Medical Weight Management Program, our physicians can prescribe FDA-approved GLP-1 receptor agonist medications including semaglutide.":
            "Como parte de nuestro Programa Médico de Control de Peso, nuestros médicos pueden recetar medicamentos agonistas del receptor GLP-1 aprobados por la FDA, incluyendo semaglutida.",
        "We also offer these medications for purchase directly through the clinic for added convenience. All prescriptions are paired with nutrition counseling and regular physician check-ins to maximize results safely.":
            "También ofrecemos estos medicamentos para su compra directamente a través de la clínica para mayor comodidad. Todas las recetas se combinan con asesoramiento nutricional y controles médicos regulares para maximizar los resultados de manera segura.",
        "Start your personalized wellness journey with our team today.":
            "Comience su viaje personalizado de bienestar con nuestro equipo hoy.",
        "Your Complete Wellness Journey": "Su Viaje Completo de Bienestar",
        "Our Two Divisions": "Nuestras Dos Divisiones",
        "Our Approach": "Nuestro Enfoque",
        "Coordinated Care": "Atención Coordinada",
        "One team, one plan.": "Un equipo, un plan.",
        "Faster Progress": "Progreso Más Rápido",
        "Better results, together.": "Mejores resultados, juntos.",
        "Physician-Backed": "Respaldado por Médicos",
        "Guided by your doctor.": "Guiado por su médico.",
        "New Program": "Nuevo Programa",
        "Medical Weight Management Program": "Programa Médico de Control de Peso",
        "Physician-Supervised": "Supervisado por Médicos",
        "How the Program Works": "Cómo Funciona el Programa",
        "Weekly Check-In": "Control Semanal",
        "Physician Review": "Revisión Médica",
        "Ongoing Support": "Apoyo Continuo",
        "What's included": "Qué incluye",
        "What\u2019s included": "Qué incluye",
        "Weekly in-clinic nutritionist visits": "Visitas semanales de nutricionista en la clínica",
        "Regular physician consultations": "Consultas médicas regulares",
        "GLP-1 medication management (semaglutide)": "Manejo de medicamentos GLP-1 (semaglutida)",
        "Personalized meal & nutrition plans": "Planes de comidas y nutrición personalizados",
        "Habit & lifestyle coaching": "Asesoramiento de hábitos y estilo de vida",
        "Body composition tracking": "Seguimiento de la composición corporal",
        "Ongoing progress monitoring": "Monitoreo continuo del progreso",
        "Medication available for purchase on-site": "Medicamento disponible para compra en el lugar",
        "About GLP-1 Medications": "Acerca de los Medicamentos GLP-1",
        "Why It Works": "Por Qué Funciona",
        "Get Started — Book a Consultation": "Comience — Reserve una Consulta",
        "Expert Wellness Guidance": "Orientación Experta en Bienestar",
        "Personalized Training Approach": "Enfoque de Entrenamiento Personalizado",
        "What we offer": "Lo que ofrecemos",
        "Weight Management Programs": "Programas de Control de Peso",
        "Diabetes & Disease Management": "Control de Diabetes y Enfermedades",
        "Meal Planning & Education": "Planificación de Comidas y Educación",
        "Heart Health & Cholesterol Support": "Apoyo a la Salud Cardíaca y Colesterol",
        "Digestive & Gut Health Guidance": "Orientación sobre Salud Digestiva e Intestinal",
        "Habit & Lifestyle Coaching": "Asesoramiento de Hábitos y Estilo de Vida",
        "Ongoing Progress Check-Ins": "Seguimiento Continuo del Progreso",
        "The Power of Integration": "El Poder de la Integración",
        "Meet Our Wellness Team": "Conozca a Nuestro Equipo de Bienestar",
        "Ready to Transform Your Health?": "¿Listo para Transformar Su Salud?",
        "Ready to Transform Your Health with Functional Medicine?": "¿Listo para Transformar Su Salud con Medicina Funcional?",
        "Book Nutrition Consultation": "Reservar Consulta de Nutrición",
        "Book Training Session": "Reservar Sesión de Entrenamiento",
        "Schedule Consultation": "Programar Consulta",
        "Nutrition & Dietetics": "Nutrición y Dietética",
        "Personal Training": "Entrenamiento Personal",
        "Functional Medicine": "Medicina Funcional",
        "Weight Management": "Control de Peso",
        "Personalized Nutrition Counseling": "Asesoramiento Nutricional Personalizado",
        "Meal Planning": "Planificación de Comidas",
        "Sports Nutrition": "Nutrición Deportiva",
        "Strength Training": "Entrenamiento de Fuerza",
        "Cardiovascular Fitness": "Condición Física Cardiovascular",
        "Nutrition Services": "Servicios de Nutrición",
        "Nutrition Coach": "Entrenadora de Nutrición",
        "Personal Trainer": "Entrenador Personal",
        "Divisions": "Divisiones",
        "What We Offer:": "Lo Que Ofrecemos:",
        "One-on-One Personal Training": "Entrenamiento Personal Individualizado",
        "Customized Workout Programs": "Programas de Entrenamiento Personalizados",
        "Strength & Conditioning": "Fuerza y Acondicionamiento",
        "Weight Loss Training": "Entrenamiento para Pérdida de Peso",
        "Athletic Performance Enhancement": "Mejora del Rendimiento Atlético",
        "Post-Injury Rehabilitation Training": "Entrenamiento de Rehabilitación Post-Lesión",
        "Senior Fitness Programs": "Programas de Fitness para Adultos Mayores",
        "Functional Fitness Training": "Entrenamiento de Fitness Funcional",
        "Coordinated Wellness Care": "Atención de Bienestar Coordinada",
        "Better Wellness Results": "Mejores Resultados de Bienestar",
        "Functional Medicine Support": "Apoyo de Medicina Funcional",
        "Diabetes Disease Management": "Manejo de la Enfermedad de Diabetes",
        "EXPERT FUNCTIONAL MEDICINE & WELLNESS GUIDANCE": "GUÍA EXPERTA DE MEDICINA FUNCIONAL Y BIENESTAR",
        "PERSONALIZED TRAINING APPROACH": "ENFOQUE DE ENTRENAMIENTO PERSONALIZADO",

        // ── Sports Medicine page ──
        "We Proudly Provide the Highest Standard of Care": "Nos Enorgullece Proporcionar el Más Alto Estándar de Atención",
        "Services We Provide": "Servicios que Proporcionamos",
        "Commonly Treated Conditions": "Condiciones Tratadas Frecuentemente",
        "Our Sports Medicine Team": "Nuestro Equipo de Medicina Deportiva",
        "Ready to Get Back in the Game?": "¿Listo para Volver al Juego?",
        "Sports Physicals": "Exámenes Físicos Deportivos",
        "Broken Bones": "Huesos Rotos",
        "Concussion Management": "Manejo de Conmociones Cerebrales",
        "Physical Therapy": "Terapia Física",
        "Rehabilitation": "Rehabilitación",
        "Injury Prevention": "Prevención de Lesiones",
        "Fractures": "Fracturas",
        "Sprains & Strains": "Esguinces y Distensiones",
        "Joint Pain": "Dolor Articular",
        "Back Pain": "Dolor de Espalda",
        "Knee Injuries": "Lesiones de Rodilla",
        "Shoulder Injuries": "Lesiones de Hombro",
        "Tendonitis": "Tendinitis",
        "Muscle Tears": "Desgarros Musculares",
        "X-Ray and Advanced Imaging Performed On-Site": "Rayos X e Imágenes Avanzadas Realizados en el Lugar",
        "Broken Bones & Fracture Care": "Cuidado de Huesos Rotos y Fracturas",
        "Concussion Management Program": "Programa de Manejo de Conmociones",
        "ImPACT Testing": "Prueba ImPACT",
        "On-Site X-Ray Services": "Servicios de Rayos X en el Lugar",
        "Injectable Pain Relief": "Alivio del Dolor Inyectable",
        "PRP (Regenerative Medicine)": "PRP (Medicina Regenerativa)",
        "Osteopathic Manipulative Treatment": "Tratamiento Manipulativo Osteopático",
        "Trigger Point Injections": "Inyecciones de Puntos Gatillo",
        "Ultrasound Guided Injections": "Inyecciones Guiadas por Ultrasonido",
        "Massage Therapy": "Masoterapia",
        "\"Return to Play\" Decision Making": "Toma de Decisiones \"Regreso al Juego\"",
        "Patient Education": "Educación del Paciente",
        "Rotator Cuff Tears": "Desgarros del Manguito Rotador",
        "Carpal Tunnel": "Túnel Carpiano",
        "Arthritis": "Artritis",
        "Foot Pain": "Dolor de Pie",
        "Concussions": "Conmociones Cerebrales",
        "MD, CAQSM": "MD, CAQSM",
        "DO, CAQSM": "DO, CAQSM",

        // ── Careers page ──
        "Join Our Team": "Únase a Nuestro Equipo",
        "Current Openings": "Vacantes Actuales",
        "Why Join Montgomery Medical Clinic?": "¿Por Qué Unirse a Montgomery Medical Clinic?",
        "Have Questions?": "¿Tiene Preguntas?",
        "Position Overview": "Descripción del Puesto",
        "Position Overview:": "Descripción del Puesto:",
        "Key Responsibilities": "Responsabilidades Clave",
        "Key Responsibilities:": "Responsabilidades Clave:",
        "Qualifications": "Calificaciones",
        "Qualifications:": "Calificaciones:",
        "To Apply": "Para Solicitar",
        "To Apply:": "Para Solicitar:",
        "Front Desk Receptionist": "Recepcionista de Mostrador",
        "Medical Assistant": "Asistente Médico",
        "Apply for Receptionist Position": "Solicitar Puesto de Recepcionista",
        "Apply for Medical Assistant Position": "Solicitar Puesto de Asistente Médico",
        "Competitive salary": "Salario competitivo",
        "Health benefits": "Beneficios de salud",
        "Paid time off": "Tiempo libre pagado",
        "Professional development": "Desarrollo profesional",
        "Full Time": "Tiempo Completo",
        "Part Time": "Tiempo Parcial",
        "Full-Time Position": "Puesto de Tiempo Completo",
        "Competitive Benefits": "Beneficios Competitivos",
        "Supportive Team": "Equipo de Apoyo",
        "Growth Opportunities": "Oportunidades de Crecimiento",
        "Why Join": "Por Qué Unirse",
        "Openings": "Vacantes",

        // ── Common page elements ──
        "Schedule an Appointment": "Programar una Cita",
        "Call (301) 208-2273": "Llamar (301) 208-2273",
        "Call (301) 709-4551": "Llamar (301) 709-4551",
        "Call Us Today": "Llámenos Hoy",
        "Learn More": "Conocer Más",
        "Read More": "Leer Más",
        "View All": "Ver Todo",
        "Back to Top": "Volver Arriba",
        "Our Team": "Nuestro Equipo",
        "Our Services": "Nuestros Servicios",
        "Our Providers": "Nuestros Proveedores",
        "Book Appointment": "Reservar Cita",
        "Get Started": "Comenzar",
        "Next Steps": "Próximos Pasos",
        "Questions?": "¿Preguntas?",
        "Yes": "Sí",
        "No": "No",
        "Open": "Abierto",
        "Closed": "Cerrado",
        "Monday": "Lunes",
        "Tuesday": "Martes",
        "Wednesday": "Miércoles",
        "Thursday": "Jueves",
        "Saturday": "Sábado",
        "Sunday": "Domingo",
        "Overview": "Descripción General",
        "Services": "Servicios",
        "Team": "Equipo",
        "Integration": "Integración",
        "Insurance": "Seguros",
        "Preparation": "Preparación",
        "Welcome": "Bienvenido",
        "Provider": "Proveedor",
        "FAQs": "Preguntas Frecuentes",
        "Our Team": "Nuestro Equipo",
        "Weight Management": "Control de Peso",

        // ── Immigration Physicals page (dedicated) ──
        "Immigration Physicals & I-693 Medical Exams": "Exámenes Físicos de Inmigración y Exámenes Médicos I-693",
        "I-693 USCIS medical exams by an authorized civil surgeon — vaccinations, lab work, and sealed paperwork for green card applicants.":
            "Exámenes médicos I-693 USCIS por un cirujano civil autorizado — vacunas, análisis de laboratorio y documentación sellada para solicitantes de tarjeta verde.",
        "What Is an Immigration Physical?": "¿Qué Es un Examen Físico de Inmigración?",
        "Purpose of the Exam": "Propósito del Examen",
        "Who Needs This Exam?": "¿Quién Necesita Este Examen?",
        "Dr. Kessous Is a USCIS-Authorized Civil Surgeon": "El Dr. Kessous Es un Cirujano Civil Autorizado por USCIS",
        "What to Bring to Your Immigration Physical": "Qué Traer a Su Examen Físico de Inmigración",
        "Passport, driver's license, or state ID": "Pasaporte, licencia de conducir o identificación estatal",
        "Translated to English if needed": "Traducidos al inglés si es necesario",
        "Names, dosages, and reasons": "Nombres, dosis y razones",
        "Any previous test results": "Cualquier resultado de pruebas previas",
        "Additional Items (If Applicable)": "Artículos Adicionales (Si Aplica)",
        "The Exam Process — What to Expect": "El Proceso del Examen — Qué Esperar",
        "First Visit — Lab Work & Records Review": "Primera Visita — Análisis de Laboratorio y Revisión de Registros",
        "Second Visit — Physical Exam & I-693": "Segunda Visita — Examen Físico e I-693",
        "Required Vaccinations for Immigration": "Vacunas Requeridas para Inmigración",
        "Required For": "Requerido Para",
        "Notes": "Notas",
        "After the Exam — Turnaround & Next Steps": "Después del Examen — Procesamiento y Próximos Pasos",
        "Do Not Open": "No Abrir",
        "Submitting to USCIS": "Presentación ante USCIS",
        "Official Government Resources": "Recursos Oficiales del Gobierno",
        "Form I-693 Instructions": "Instrucciones del Formulario I-693",
        "Form I-485 Instructions": "Instrucciones del Formulario I-485",
        "USCIS: Finding a Medical Doctor": "USCIS: Encontrar un Médico",
        "CDC Civil Surgeon Resources": "Recursos de Cirujanos Civiles del CDC",
        "Common questions about immigration physicals and Form I-693.":
            "Preguntas comunes sobre exámenes físicos de inmigración y el Formulario I-693.",
        "What is a Form I-693 immigration physical?": "¿Qué es un examen físico de inmigración del Formulario I-693?",
        "What does the immigration physical include?": "¿Qué incluye el examen físico de inmigración?",
        "How many visits does the immigration physical require?": "¿Cuántas visitas requiere el examen físico de inmigración?",
        "How long does it take to get the I-693 paperwork back?": "¿Cuánto tiempo tarda en obtener la documentación I-693?",
        "What should I bring to my immigration physical?": "¿Qué debo llevar a mi examen físico de inmigración?",
        "Can I open the sealed I-693 envelope?": "¿Puedo abrir el sobre sellado del I-693?",
        "Does insurance cover the immigration physical?": "¿El seguro cubre el examen físico de inmigración?",
        "How long is the I-693 valid?": "¿Cuánto tiempo es válido el I-693?",
        "What if my exam reveals a medical problem?": "¿Qué pasa si mi examen revela un problema médico?",
        "Contact us to book your USCIS immigration medical examination with Dr. Kessous.":
            "Contáctenos para reservar su examen médico de inmigración USCIS con el Dr. Kessous.",
        "Call to Schedule": "Llame para Programar",
        "Search civil surgeons →": "Buscar cirujanos civiles →",
        "View CDC guide →": "Ver guía del CDC →",
        "View form →": "Ver formulario →",
        "Read USCIS guide →": "Leer guía de USCIS →",
        "View CDC resources →": "Ver recursos del CDC →",
        "Bring Your Vaccination Records": "Traiga Sus Registros de Vacunación",

        // ── FAA Pilot Resources page ──
        "Everything you need to prepare for your FAA medical exam — certificate classes, medication lookup, CACI worksheets, and pre-visit checklists.":
            "Todo lo que necesita para prepararse para su examen médico FAA — clases de certificados, búsqueda de medicamentos, hojas de trabajo CACI y listas de verificación previas a la visita.",
        "Medical Certificate Classes": "Clases de Certificados Médicos",
        "New vs. Returning Pilots": "Pilotos Nuevos vs. Pilotos que Regresan",
        "Pre-Visit Checklist": "Lista de Verificación Previa a la Visita",
        "Medication Lookup": "Búsqueda de Medicamentos",
        "CACI Worksheets": "Hojas de Trabajo CACI",
        "Official FAA Resources": "Recursos Oficiales de la FAA",
        "Book FAA Physical": "Reservar Examen Físico FAA",
        "Book Your FAA Physical": "Reserve Su Examen Físico FAA",
        "FAA Medical Certificate Classes": "Clases de Certificados Médicos FAA",
        "Airline Transport Pilot (ATP)": "Piloto de Transporte Aéreo (ATP)",
        "Private & Student Pilot": "Piloto Privado y Estudiante",
        "Validity Periods & Renewal Schedule": "Períodos de Validez y Calendario de Renovación",
        "Medical Class": "Clase Médica",
        "Privileges": "Privilegios",
        "Under Age 40": "Menores de 40 Años",
        "Age 40 & Older": "Mayores de 40 Años",
        "Guidance for New & Returning Pilots": "Guía para Pilotos Nuevos y que Regresan",
        "First-Time / Student Pilots": "Pilotos por Primera Vez / Estudiantes",
        "Returning / Experienced Pilots": "Pilotos que Regresan / Experimentados",
        "Getting Started": "Comenzar",
        "What to Expect at Your First Exam": "Qué Esperar en Su Primer Examen",
        "Certification Maintenance": "Mantenimiento de Certificación",
        "Managing New Conditions": "Manejo de Nuevas Condiciones",
        "Flight Physical Pre-Visit Checklist": "Lista de Verificación Previa al Examen Físico de Vuelo",
        "Good to know:": "Bueno saber:",
        "FAA Medication Lookup": "Búsqueda de Medicamentos FAA",
        "Quick Medication Search": "Búsqueda Rápida de Medicamentos",
        "All Categories": "Todas las Categorías",
        "All Statuses": "Todos los Estados",
        "Allowed": "Permitido",
        "Not Allowed": "No Permitido",
        "Loading medications…": "Cargando medicamentos…",
        "For informational purposes only. Based on publicly available FAA guidance.":
            "Solo con fines informativos. Basado en la guía FAA disponible públicamente.",
        "Common OTC Wait Times": "Tiempos de Espera Comunes para Medicamentos de Venta Libre",
        "CACI Condition Worksheets": "Hojas de Trabajo de Condiciones CACI",
        "What Must a DCPN Include?": "¿Qué Debe Incluir un DCPN?",
        "PDF Worksheet": "Hoja de Trabajo PDF",
        "Official FAA Medication Resources": "Recursos Oficiales de Medicamentos FAA",
        "FAA Pharmaceuticals Guide": "Guía de Fármacos FAA",
        "Do Not Issue / Do Not Fly List": "Lista de No Emitir / No Volar",
        "OTC Medications Reference": "Referencia de Medicamentos de Venta Libre",
        "Pilot Medication Brochure": "Folleto de Medicamentos para Pilotos",
        "Pilots & Medication Safety Briefing": "Sesión Informativa sobre Pilotos y Seguridad de Medicamentos",
        "Search full database →": "Buscar base de datos completa →",
        "View guide →": "Ver guía →",
        "View DNI/DNF list →": "Ver lista DNI/DNF →",
        "View OTC guide →": "Ver guía de venta libre →",
        "Download PDF →": "Descargar PDF →",
        "Read article →": "Leer artículo →",
        "Common questions about FAA medical certification, medications, and CACI.":
            "Preguntas comunes sobre certificación médica FAA, medicamentos y CACI.",
        "What is a CACI condition?": "¿Qué es una condición CACI?",
        "What happens if I don't renew my Class 1 medical on time?":
            "¿Qué pasa si no renuevo mi certificado médico Clase 1 a tiempo?",
        "Do I need to complete MedXPress before my exam?": "¿Necesito completar MedXPress antes de mi examen?",
        "How do I know if my medication is approved for flying?":
            "¿Cómo sé si mi medicamento está aprobado para volar?",
        "What is BasicMed?": "¿Qué es BasicMed?",
        "Does insurance cover FAA physicals?": "¿El seguro cubre los exámenes físicos FAA?",
        "What if I don't meet medical criteria at the time of exam?":
            "¿Qué pasa si no cumplo los criterios médicos al momento del examen?",
        "Book online or call us to set up your aviation medical examination with Dr. Kessous.":
            "Reserve en línea o llámenos para programar su examen médico de aviación con el Dr. Kessous.",

        // ── Privacy Policy & Terms of Service ──
        "Privacy Policy": "Política de Privacidad",
        "How Montgomery Medical Clinic collects, uses, and protects your information.":
            "Cómo Montgomery Medical Clinic recopila, utiliza y protege su información.",
        "Last Updated:": "Última Actualización:",
        "Terms of Service": "Términos de Servicio",
        "Terms and conditions governing your use of the Montgomery Medical Clinic website.":
            "Términos y condiciones que rigen el uso del sitio web de Montgomery Medical Clinic.",
        "1. Information We Collect": "1. Información que Recopilamos",
        "2. How We Use Your Information": "2. Cómo Usamos Su Información",
        "3. Protected Health Information (PHI) & HIPAA": "3. Información de Salud Protegida (PHI) y HIPAA",
        "4. Cookies and Local Storage": "4. Cookies y Almacenamiento Local",
        "5. How We Share Your Information": "5. Cómo Compartimos Su Información",
        "6. Data Security": "6. Seguridad de Datos",
        "7. Children's Privacy": "7. Privacidad de los Niños",
        "8. Your Rights and Choices": "8. Sus Derechos y Opciones",
        "9. Third-Party Links": "9. Enlaces de Terceros",
        "10. Changes to This Privacy Policy": "10. Cambios a Esta Política de Privacidad",
        "11. Contact Us": "11. Contáctenos",
        "12. Complaints": "12. Quejas",
        "1. Acceptance of Terms": "1. Aceptación de los Términos",
        "2. Website Purpose & Medical Disclaimer": "2. Propósito del Sitio Web y Descargo de Responsabilidad Médica",
        "3. Use of the Website": "3. Uso del Sitio Web",
        "4. Third-Party Services & Links": "4. Servicios y Enlaces de Terceros",
        "5. Intellectual Property": "5. Propiedad Intelectual",
        "6. Disclaimer of Warranties": "6. Descargo de Garantías",
        "7. Limitation of Liability": "7. Limitación de Responsabilidad",
        "8. Indemnification": "8. Indemnización",
        "9. Appointment Scheduling & Cancellation": "9. Programación y Cancelación de Citas",
        "10. Insurance & Payment": "10. Seguros y Pagos",
        "11. Accessibility": "11. Accesibilidad",
        "12. Governing Law & Jurisdiction": "12. Ley Aplicable y Jurisdicción",
        "13. Severability": "13. Divisibilidad",
        "14. Entire Agreement": "14. Acuerdo Completo",
        "15. Contact Information": "15. Información de Contacto",

        // ═══════════════════════════════════════════════════════════════════
        // Page-specific full-sentence coverage (added 2026-04-14)
        // Every visible English string on insurance, about, urgent-primary-care,
        // immigration-physicals, faa-physicals, occupational-health.
        // ═══════════════════════════════════════════════════════════════════

        // ── Insurance page (hero, coverage checker, plan list, FAQ) ──
        "Search your plan in seconds. We work with most major commercial carriers, Medicare, Medicaid, Tricare, and Maryland state plans.":
            "Busque su plan en segundos. Trabajamos con la mayoría de las principales aseguradoras comerciales, Medicare, Medicaid, Tricare y planes estatales de Maryland.",
        "Coverage Checker": "Verificador de Cobertura",
        "Is your insurance accepted?": "¿Aceptamos su seguro?",
        "Type your carrier or plan name below to instantly check if it's in our network. We continually update our list — if you don't see yours, call us at":
            "Escriba el nombre de su aseguradora o plan a continuación para verificar al instante si está en nuestra red. Actualizamos nuestra lista continuamente — si no ve el suyo, llámenos al",
        "and we'll confirm.": "y se lo confirmaremos.",
        "Check your plan": "Verifique su plan",
        "e.g. Aetna, BlueCross, Medicare, Priority Partners…": "ej. Aetna, BlueCross, Medicare, Priority Partners…",
        "Not sure? Call": "¿No está seguro? Llame al",
        "or text": "o envíe un mensaje al",
        "Full Plan List": "Lista Completa de Planes",
        "Insurance plans we accept": "Planes de seguro que aceptamos",
        "We're pleased to accept a wide variety of insurance providers. Please remember it's your responsibility to know your co-pay, deductible, and any limits that apply to your plan.":
            "Nos complace aceptar una amplia variedad de proveedores de seguros. Por favor recuerde que es su responsabilidad conocer su copago, deducible y cualquier límite que aplique a su plan.",
        "9 carriers": "9 aseguradoras",
        "9 plans": "9 planes",
        "Aetna commercial plans": "Planes comerciales de Aetna",
        "Referral": "Referencia Requerida",
        "Most PPO and HMO commercial plans are accepted for both primary care and walk-in urgent visits.":
            "La mayoría de los planes comerciales PPO y HMO son aceptados tanto para atención primaria como para visitas de urgencia sin cita.",
        "Maryland State & Medicaid": "Medicaid y Estado de Maryland",
        "Serving Maryland residents with Medicare, Medicaid, and state-sponsored managed care plans across Montgomery County.":
            "Servimos a residentes de Maryland con Medicare, Medicaid y planes de atención administrada patrocinados por el estado en todo el condado de Montgomery.",
        "Self-Pay & Other": "Pago Directo y Otros",
        "Affordable rates": "Tarifas asequibles",
        "Self-pay — transparent upfront pricing": "Pago directo — precios transparentes por adelantado",
        "Cash discounts for same-day visits": "Descuentos en efectivo para visitas del mismo día",
        "Occupational health billing (employer direct)": "Facturación de salud ocupacional (directa al empleador)",
        "Immigration & FAA exams (flat rate)": "Exámenes de Inmigración y FAA (tarifa fija)",
        "Sports physicals (flat rate)": "Exámenes físicos deportivos (tarifa fija)",
        "MVA physicals (flat rate)": "Exámenes físicos MVA (tarifa fija)",
        "No insurance? No problem. Call for current self-pay pricing before your visit.":
            "¿Sin seguro? No hay problema. Llame para conocer los precios actuales de pago directo antes de su visita.",
        "What to bring": "Qué traer",
        "A valid photo ID, your current insurance card, a medication list, and any referral paperwork if your plan requires it.":
            "Una identificación con foto válida, su tarjeta de seguro actual, una lista de medicamentos y cualquier documento de referencia si su plan lo requiere.",
        "Co-pays & billing": "Copagos y facturación",
        "Co-pays are collected at check-in. We file claims directly with your carrier so you can focus on getting well, not paperwork.":
            "Los copagos se cobran al registrarse. Presentamos las reclamaciones directamente a su aseguradora para que pueda concentrarse en recuperarse, no en el papeleo.",
        "Still not sure?": "¿Aún no está seguro?",
        "Our front desk will verify your plan before you come in.":
            "Nuestra recepción verificará su plan antes de que venga.",
        "Insurance FAQ": "Preguntas Frecuentes sobre Seguros",
        "Common questions about coverage": "Preguntas comunes sobre cobertura",
        "Answers to the most frequent insurance questions from our Gaithersburg patients.":
            "Respuestas a las preguntas más frecuentes sobre seguros de nuestros pacientes de Gaithersburg.",
        "Does Montgomery Medical Clinic accept my insurance?":
            "¿Montgomery Medical Clinic acepta mi seguro?",
        "We accept a wide range of commercial, Medicare, Medicaid, and Maryland state plans — including Aetna, BlueCross BlueShield (CareFirst), Cigna, UnitedHealthcare, Medicare, Medicaid, Priority Partners, Amerigroup/Wellpoint, Maryland Physicians Care, Tricare, GEHA, Humana, and Johns Hopkins US Family Health. Use the coverage checker above or call":
            "Aceptamos una amplia variedad de planes comerciales, Medicare, Medicaid y estatales de Maryland — incluyendo Aetna, BlueCross BlueShield (CareFirst), Cigna, UnitedHealthcare, Medicare, Medicaid, Priority Partners, Amerigroup/Wellpoint, Maryland Physicians Care, Tricare, GEHA, Humana y Johns Hopkins US Family Health. Use el verificador de cobertura arriba o llame al",
        "to confirm your specific plan.": "para confirmar su plan específico.",
        "Do you accept Medicare and Medicaid in Gaithersburg, MD?":
            "¿Aceptan Medicare y Medicaid en Gaithersburg, MD?",
        "Yes. We accept Medicare and Maryland Medicaid, as well as Medicaid managed care plans such as Priority Partners, Amerigroup/Wellpoint, and Maryland Physicians Care.":
            "Sí. Aceptamos Medicare y Medicaid de Maryland, así como planes de atención administrada de Medicaid como Priority Partners, Amerigroup/Wellpoint y Maryland Physicians Care.",
        "What if I don't have insurance?": "¿Qué pasa si no tengo seguro?",
        "We offer affordable self-pay rates for urgent care, primary care, and physical exams. Call":
            "Ofrecemos tarifas asequibles de pago directo para atención urgente, atención primaria y exámenes físicos. Llame al",
        "for current self-pay pricing before your visit — we'll give you a transparent quote upfront.":
            "para conocer los precios actuales de pago directo antes de su visita — le daremos una cotización transparente por adelantado.",
        "Do I need a referral to be seen?": "¿Necesito una referencia para ser atendido?",
        "For HMO-style plans including UnitedHealthcare, Tricare, Priority Partners, Amerigroup/Wellpoint, Maryland Physicians Care, Medicaid, Medstar, CareFirst Community Health Plan, and Johns Hopkins US Family Health, a referral from your primary care physician may be required to see a specialty provider. Walk-in urgent care and primary care visits generally do not require a referral.":
            "Para planes tipo HMO incluyendo UnitedHealthcare, Tricare, Priority Partners, Amerigroup/Wellpoint, Maryland Physicians Care, Medicaid, Medstar, CareFirst Community Health Plan y Johns Hopkins US Family Health, puede requerirse una referencia de su médico de atención primaria para ver a un proveedor especializado. Las visitas de atención urgente sin cita y de atención primaria generalmente no requieren referencia.",
        "What should I bring to my appointment?": "¿Qué debo traer a mi cita?",
        "Please bring a valid photo ID, your current insurance card, a list of current medications, and any referral paperwork if required by your plan.":
            "Por favor traiga una identificación con foto válida, su tarjeta de seguro actual, una lista de medicamentos actuales y cualquier documento de referencia si lo requiere su plan.",
        "Do you accept Tricare for military families?":
            "¿Aceptan Tricare para familias militares?",
        "Yes, we accept Tricare. A referral may be required depending on your Tricare plan — our front desk will verify before your visit.":
            "Sí, aceptamos Tricare. Puede requerirse una referencia dependiendo de su plan Tricare — nuestra recepción verificará antes de su visita.",
        "How are co-pays handled at check-in?": "¿Cómo se manejan los copagos al registrarse?",
        "Co-pays are collected at the time of check-in. We accept cash, credit/debit cards, and HSA/FSA cards. We file insurance claims directly with your carrier after your visit.":
            "Los copagos se cobran al momento del registro. Aceptamos efectivo, tarjetas de crédito/débito y tarjetas HSA/FSA. Presentamos las reclamaciones de seguro directamente a su aseguradora después de su visita.",
        "Can my employer be billed directly for occupational health?":
            "¿Mi empleador puede ser facturado directamente por salud ocupacional?",
        "Yes — for pre-employment screenings, workers' compensation, drug testing, respirator fit tests, and corporate wellness programs, we bill your employer directly. See our":
            "Sí — para exámenes previos al empleo, compensación laboral, pruebas de drogas, pruebas de ajuste de respirador y programas de bienestar corporativo, facturamos directamente a su empleador. Consulte nuestra",
        "Occupational Health page": "página de Salud Ocupacional",
        "for details.": "para más detalles.",

        // ── About page ──
        "Your trusted healthcare partner.": "Su socio de confianza en atención médica.",
        "About Us": "Sobre Nosotros",
        "When it comes to your health, you deserve exceptional care from a team you can trust. With over five decades of combined experience, our physicians provide compassionate, comprehensive care tailored to your unique needs.":
            "Cuando se trata de su salud, merece atención excepcional de un equipo en el que puede confiar. Con más de cinco décadas de experiencia combinada, nuestros médicos brindan atención compasiva e integral adaptada a sus necesidades únicas.",
        "Whether you need immediate medical attention, a routine vaccination, or your yearly annual, we're here when you need us most. Our Dermatology Department offers specialized expertise in diagnosing and treating a wide range of skin conditions.":
            "Ya sea que necesite atención médica inmediata, una vacuna de rutina o su examen anual, estamos aquí cuando más nos necesita. Nuestro Departamento de Dermatología ofrece experiencia especializada en el diagnóstico y tratamiento de una amplia gama de afecciones de la piel.",
        "Your health — and your confidence — are our top priorities.":
            "Su salud — y su confianza — son nuestras principales prioridades.",
        "We've designed our facility to provide convenient, comprehensive care. Our on-site services and experienced medical team ensure you receive prompt diagnosis and treatment without the need for multiple appointments or referrals.":
            "Hemos diseñado nuestras instalaciones para brindar atención conveniente e integral. Nuestros servicios en el lugar y el equipo médico experimentado garantizan que reciba un diagnóstico y tratamiento rápidos sin necesidad de múltiples citas o referencias.",
        "Quality healthcare should be accessible and efficient. That's why we've integrated essential medical services right here in our clinic, getting you on the path to wellness faster.":
            "La atención médica de calidad debe ser accesible y eficiente. Por eso hemos integrado servicios médicos esenciales aquí mismo en nuestra clínica, llevándole al camino del bienestar más rápido.",
        "Our Facility": "Nuestras Instalaciones",
        // About page specialty badges
        "Women's Health": "Salud de la Mujer",
        "Urgent Care": "Atención Urgente",
        "FAA Medical Examiner": "Examinador Médico FAA",
        "OB/GYN": "Obstetricia y Ginecología",
        "Orthopedics": "Ortopedia",
        "MSK Ultrasound": "Ultrasonido Musculoesquelético",
        "OMT": "Tratamiento Manipulativo Osteopático",
        "Melanoma": "Melanoma",
        "Cutaneous Oncology": "Oncología Cutánea",
        "Physical Therapy": "Terapia Física",
        "Orthopedic Conditions": "Condiciones Ortopédicas",
        "Sports Injuries": "Lesiones Deportivas",
        "Spinal Manipulation": "Manipulación Espinal",
        "Dry Needling": "Punción Seca",
        "Scoliosis Treatment": "Tratamiento de Escoliosis",
        "Nutrition Coaching": "Asesoramiento Nutricional",
        "Behavior Change Support": "Apoyo para Cambio de Conducta",
        "Strength & Mobility": "Fuerza y Movilidad",
        "Chinese Medicine": "Medicina China",
        "Pain Management": "Manejo del Dolor",
        "Fertility Treatment": "Tratamiento de Fertilidad",
        "Cupping Therapy": "Terapia de Ventosas",
        "MD, Board Certified Dermatologist": "MD, Dermatóloga Certificada",
        "MD, MPH, Board Certified Dermatologist": "MD, MPH, Dermatóloga Certificada",
        "L.Ac., DAOM (candidate)": "L.Ac., DAOM (candidata)",
        "Nutrition Coach": "Entrenadora de Nutrición",
        "Personal Trainer": "Entrenador Personal",
        "His approach is unique in that he tries to focus on the origin of the clinical symptoms even for extremity overuse syndromes and acute injuries. This comes from his own treatment for the injuries he sustained while practicing martial arts and practicing manual therapy for diverse spinal patients. He has practiced martial arts in Taekwondo, Kickboxing, kendo, boxing and has seen various martial arts associated injuries. He also has worked on diverse scoliosis patients helping them relieve pain and lead their lives at their full strength.":
            "Su enfoque es único en que intenta centrarse en el origen de los síntomas clínicos incluso para síndromes de uso excesivo de extremidades y lesiones agudas. Esto proviene de su propio tratamiento para las lesiones que sufrió practicando artes marciales y practicando terapia manual para diversos pacientes espinales. Ha practicado artes marciales en Taekwondo, Kickboxing, kendo, boxeo y ha visto varias lesiones asociadas a las artes marciales. También ha trabajado con diversos pacientes de escoliosis ayudándoles a aliviar el dolor y llevar sus vidas con plena fuerza.",

        // ── Urgent & Primary Care page — detailed strings ──
        "Comprehensive medical services for your whole family. Walk in for immediate care or schedule an appointment for ongoing health management.":
            "Servicios médicos integrales para toda su familia. Entre sin cita para atención inmediata o programe una cita para el manejo continuo de su salud.",
        "Our Approach to Care": "Nuestro Enfoque de Atención",
        "A trusted physician for your family": "Un médico de confianza para su familia",
        "whenever you need one.": "siempre que lo necesite.",
        "From everyday wellness visits to same-day urgent needs, Montgomery Medical Clinic gives you a physician who knows your history — and the flexibility to walk in when life doesn't wait.":
            "Desde visitas de bienestar diarias hasta necesidades urgentes del mismo día, Montgomery Medical Clinic le brinda un médico que conoce su historial — y la flexibilidad de entrar sin cita cuando la vida no espera.",
        "Patients who see their doctor regularly": "Los pacientes que consultan a su médico regularmente",
        "manage chronic conditions better, spend less on care, and report stronger satisfaction with their health":
            "manejan mejor las condiciones crónicas, gastan menos en atención y reportan mayor satisfacción con su salud",
        ". We make that easier for every member of your family.":
            ". Hacemos que eso sea más fácil para cada miembro de su familia.",
        "Walk-In Access": "Acceso sin Cita",
        "No appointment, no problem.": "Sin cita, sin problema.",
        "Our physicians are available without an appointment six days a week, with flexible hours and most holidays open — so you can see a doctor on your schedule, not the other way around.":
            "Nuestros médicos están disponibles sin cita previa seis días a la semana, con horarios flexibles y la mayoría de los días festivos abiertos — para que pueda ver a un médico en su horario, no al revés.",
        "Same-day visits": "Visitas el mismo día",
        "Open 6 days": "Abierto 6 días",
        "Most holidays": "La mayoría de los días festivos",
        "Most major plans accepted.": "Se aceptan la mayoría de los planes principales.",
        "We work with most major insurance carriers and file claims directly, so the focus stays on your care instead of the paperwork behind it.":
            "Trabajamos con la mayoría de las principales aseguradoras y presentamos reclamaciones directamente, para que el enfoque se mantenga en su atención en lugar del papeleo detrás de ella.",
        "View accepted providers": "Ver proveedores aceptados",
        "On-Site Diagnostics": "Diagnóstico en el Lugar",
        "Labs and imaging, under one roof.": "Laboratorio e imágenes, bajo un mismo techo.",
        "In-house bloodwork, digital X-ray, and advanced imaging mean faster answers and fewer referrals — you leave with a plan, not a waitlist.":
            "Análisis de sangre internos, rayos X digitales e imágenes avanzadas significan respuestas más rápidas y menos referencias — usted se va con un plan, no con una lista de espera.",
        "Digital X-ray": "Rayos X Digitales",
        "Lab work": "Trabajo de Laboratorio",
        "Rapid results": "Resultados Rápidos",
        "Our Services": "Nuestros Servicios",
        "From preventive care and routine checkups to urgent visits for immediate needs, we provide complete healthcare services for your family.":
            "Desde atención preventiva y revisiones de rutina hasta visitas urgentes por necesidades inmediatas, proporcionamos servicios de salud completos para su familia.",
        "Preventive Care Services": "Servicios de Atención Preventiva",
        "Urgent Care Services": "Servicios de Atención Urgente",
        "Our Physicians": "Nuestros Médicos",
        "Board-certified physicians specializing in family medicine, dedicated to your health and wellbeing.":
            "Médicos certificados especializados en medicina familiar, dedicados a su salud y bienestar.",
        "Dr. Efi Kessous is a board-certified family medicine physician at Montgomery Medical Clinic. He is also an Assistant Professor and faculty member at The George Washington University School of Medicine & Health Sciences.":
            "El Dr. Efi Kessous es un médico certificado de medicina familiar en Montgomery Medical Clinic. También es Profesor Asistente y miembro del cuerpo docente de la Escuela de Medicina y Ciencias de la Salud de la Universidad George Washington.",
        "His clinical interests include procedural family medicine, injury management, women's health, and occupational medicine. Dr. Kessous is committed to providing comprehensive care for individuals and families.":
            "Sus intereses clínicos incluyen medicina familiar de procedimientos, manejo de lesiones, salud de la mujer y medicina ocupacional. El Dr. Kessous está comprometido a brindar atención integral para individuos y familias.",
        "Dr. Bertha Velandia is an experienced family medicine physician who received her medical degree from the Universidad Nacional in Bogota, Colombia in 1983. She completed her residency in family medicine at the UAB Huntsville Medical Campus in 2009.":
            "La Dra. Bertha Velandia es una médica experimentada de medicina familiar que recibió su título médico de la Universidad Nacional en Bogotá, Colombia en 1983. Completó su residencia en medicina familiar en el Campus Médico UAB Huntsville en 2009.",
        "Dr. Velandia brings warmth and experience to every patient interaction, making healthcare accessible and compassionate for families in Gaithersburg.":
            "La Dra. Velandia aporta calidez y experiencia a cada interacción con el paciente, haciendo que la atención médica sea accesible y compasiva para las familias en Gaithersburg.",
        "Dr. Lawless is dual board-certified in family medicine and sports medicine. He completed his training at Northwell Plainview Hospital in Plainview, NY, and graduated from Lake Erie College of Osteopathic Medicine in 2012.":
            "El Dr. Lawless tiene doble certificación en medicina familiar y medicina deportiva. Completó su entrenamiento en el Hospital Northwell Plainview en Plainview, NY, y se graduó del Colegio de Medicina Osteopática del lago Erie en 2012.",
        "His training includes a traditional rotating internship at UPMC Mercy Hospital in Pittsburgh, PA. He was appointed as a teaching associate in family medicine at Hofstra Northwell School of Medicine during his sports medicine fellowship.":
            "Su entrenamiento incluye una pasantía rotatoria tradicional en el Hospital UPMC Mercy en Pittsburgh, PA. Fue nombrado asociado docente en medicina familiar en la Escuela de Medicina Hofstra Northwell durante su beca de medicina deportiva.",
        "Dr. Lawless' expertise includes musculoskeletal care, diagnostic ultrasound, ultrasound-guided injections, and osteopathic treatment. He provides comprehensive care for both acute and chronic conditions.":
            "La experiencia del Dr. Lawless incluye atención musculoesquelética, ultrasonido diagnóstico, inyecciones guiadas por ultrasonido y tratamiento osteopático. Brinda atención integral tanto para condiciones agudas como crónicas.",
        "Common questions about urgent care and primary care at Montgomery Medical Clinic.":
            "Preguntas comunes sobre atención urgente y atención primaria en Montgomery Medical Clinic.",
        "Do I need an appointment, or can I walk in?": "¿Necesito una cita o puedo entrar sin cita?",
        "We accept walk-ins": "Aceptamos pacientes sin cita",
        "7 days a week": "7 días a la semana",
        "and also offer scheduled appointments.": "y también ofrecemos citas programadas.",
        "Walk-ins are seen on a first-come, first-served basis. For the shortest wait, book same-day appointments online or call":
            "Los pacientes sin cita se atienden por orden de llegada. Para la espera más corta, reserve citas del mismo día en línea o llame al",
        "What are your hours? Are you open on weekends?":
            "¿Cuál es su horario? ¿Están abiertos los fines de semana?",
        "Yes, we are open": "Sí, estamos abiertos",
        ", including weekends and most holidays.": ", incluyendo fines de semana y la mayoría de los días festivos.",
        "Check our website or call": "Consulte nuestro sitio web o llame al",
        "for current hours.": "para conocer el horario actual.",
        "What conditions does your urgent care treat?": "¿Qué condiciones trata su atención urgente?",
        "We treat a wide range of non-emergency conditions, including:":
            "Tratamos una amplia gama de condiciones no urgentes, incluyendo:",
        "Colds, flu, and respiratory infections": "Resfriados, gripe e infecciones respiratorias",
        "Minor injuries, sprains, and cuts requiring stitches": "Lesiones menores, esguinces y cortes que requieren puntos",
        "Allergic reactions, UTIs, ear infections, and rashes": "Reacciones alérgicas, infecciones urinarias, infecciones de oído y erupciones",
        "Important:": "Importante:",
        "For life-threatening emergencies such as chest pain, stroke symptoms, or severe bleeding, call":
            "Para emergencias que amenazan la vida como dolor en el pecho, síntomas de derrame cerebral o sangrado severo, llame al",
        "or go to the nearest emergency room.": "o vaya a la sala de emergencias más cercana.",
        "Can I establish a primary care doctor at Montgomery Medical Clinic?":
            "¿Puedo establecer un médico de atención primaria en Montgomery Medical Clinic?",
        "Absolutely.": "Absolutamente.",
        "We offer ongoing primary care including:": "Ofrecemos atención primaria continua incluyendo:",
        "Annual physicals and wellness exams": "Exámenes físicos anuales y de bienestar",
        "Chronic disease management (diabetes, hypertension, asthma)": "Manejo de enfermedades crónicas (diabetes, hipertensión, asma)",
        "Preventive screenings and immunizations": "Evaluaciones preventivas e inmunizaciones",
        "You can choose a provider and build a long-term relationship with your doctor.":
            "Puede elegir un proveedor y establecer una relación a largo plazo con su médico.",
        "What insurance plans do you accept for urgent care and primary care?":
            "¿Qué planes de seguro aceptan para atención urgente y atención primaria?",
        "We accept most major insurance plans, including:":
            "Aceptamos la mayoría de los planes de seguro principales, incluyendo:",
        "Aetna, BlueCross BlueShield (CareFirst), Cigna, UnitedHealthcare":
            "Aetna, BlueCross BlueShield (CareFirst), Cigna, UnitedHealthcare",
        "Medicare, Medicaid, Priority Partners, Amerigroup": "Medicare, Medicaid, Priority Partners, Amerigroup",
        "Tricare, and many more": "Tricare y muchos más",
        "Self-pay options are also available. Visit our": "Las opciones de pago directo también están disponibles. Visite nuestra",
        "insurance page": "página de seguros",
        "or call to verify your plan.": "o llame para verificar su plan.",

        // ── Immigration Physicals page — detailed strings ──
        "If you are applying for a green card (lawful permanent resident status), USCIS requires a medical examination documented on":
            "Si está solicitando una tarjeta verde (estatus de residente permanente legal), USCIS requiere un examen médico documentado en el",
        "— the Report of Medical Examination and Vaccination Record. This form must be completed and signed by a":
            "— el Informe de Examen Médico y Registro de Vacunación. Este formulario debe ser completado y firmado por un",
        "USCIS-designated civil surgeon": "cirujano civil designado por USCIS",
        "Screen for communicable diseases (TB, syphilis, gonorrhea)":
            "Detección de enfermedades transmisibles (TB, sífilis, gonorrea)",
        "Verify vaccination records per CDC technical instructions":
            "Verificación de registros de vacunación según las instrucciones técnicas del CDC",
        "Assess physical and mental health conditions":
            "Evaluación de condiciones de salud física y mental",
        "Document findings on Form I-693 for USCIS review":
            "Documentación de hallazgos en el Formulario I-693 para revisión de USCIS",
        "Applicants filing": "Solicitantes que presentan el",
        "(Adjustment of Status)": "(Ajuste de Estatus)",
        "Green card applicants through": "Solicitantes de tarjeta verde a través de",
        "family sponsorship": "patrocinio familiar",
        "employment": "empleo",
        "Applicants adjusting status through": "Solicitantes que ajustan su estatus a través de",
        "other categories": "otras categorías",
        "(asylum, diversity visa, etc.)": "(asilo, visa de diversidad, etc.)",
        "Dr. Efraim Kessous is listed in the": "El Dr. Efraim Kessous está listado en el",
        "official USCIS civil surgeon directory": "directorio oficial de cirujanos civiles de USCIS",
        "and is fully authorized to conduct I-693 medical examinations in Maryland. All exams follow the latest CDC and USCIS protocols.":
            "y está completamente autorizado para realizar exámenes médicos I-693 en Maryland. Todos los exámenes siguen los protocolos más recientes del CDC y USCIS.",
        "Come prepared with the following to ensure a smooth appointment and timely I-693 processing.":
            "Venga preparado con lo siguiente para garantizar una cita sin problemas y el procesamiento oportuno del I-693.",
        "Government Photo ID": "Identificación con Foto del Gobierno",
        "Passport, driver's license, or state ID": "Pasaporte, licencia de conducir o identificación estatal",
        "Vaccination Records": "Registros de Vacunación",
        "Translated to English if needed": "Traducidos al inglés si es necesario",
        "Current Medications List": "Lista de Medicamentos Actuales",
        "Names, dosages, and reasons": "Nombres, dosis y razones",
        "Prior TB / STI Records": "Registros Previos de TB / ITS",
        "Any previous test results": "Cualquier resultado de pruebas previas",
        "Additional Items (If Applicable)": "Artículos Adicionales (Si Aplica)",
        "USCIS appointment letter": "carta de cita de USCIS",
        "or instructions referencing Form I-693": "o instrucciones que hagan referencia al Formulario I-693",
        "with Part 1 completed (blank copies available at our office)":
            "con la Parte 1 completada (copias en blanco disponibles en nuestra oficina)",
        "For applicants under 14:": "Para solicitantes menores de 14 años:",
        "Proof of identity with full name, date and place of birth, and parent information (e.g., birth certificate)":
            "Prueba de identidad con nombre completo, fecha y lugar de nacimiento e información de los padres (por ejemplo, certificado de nacimiento)",
        "The Exam Process — What to Expect": "El Proceso del Examen — Qué Esperar",
        "The immigration physical typically requires": "El examen físico de inmigración típicamente requiere",
        "two visits": "dos visitas",
        ". We complete all lab work on your first visit so results are ready when you return.":
            ". Completamos todo el trabajo de laboratorio en su primera visita para que los resultados estén listos cuando regrese.",
        "First Visit — Lab Work & Records Review": "Primera Visita — Análisis y Revisión de Registros",
        "Second Visit — Physical Exam & I-693": "Segunda Visita — Examen Físico e I-693",
        "TB screening": "Detección de TB",
        "— blood test (IGRA) for most patients; skin test (TST) for children under 2":
            "— análisis de sangre (IGRA) para la mayoría de los pacientes; prueba cutánea (TST) para niños menores de 2 años",
        "Syphilis blood test": "Análisis de sangre para sífilis",
        "— required for ages 15 and older": "— requerido para edades de 15 años en adelante",
        "Gonorrhea urine test": "Análisis de orina para gonorrea",
        "Vaccination record review": "Revisión del registro de vacunación",
        "— we identify which vaccines are needed": "— identificamos qué vacunas se necesitan",
        "Medical history review": "Revisión del historial médico",
        "— comprehensive health evaluation": "— evaluación integral de salud",
        "Complete physical examination": "Examen físico completo",
        "by Dr. Kessous (civil surgeon)": "por el Dr. Kessous (cirujano civil)",
        "Lab results review": "Revisión de resultados de laboratorio",
        "— all test results reviewed and documented": "— todos los resultados de las pruebas revisados y documentados",
        "Required vaccinations": "Vacunas requeridas",
        "administered if needed": "administradas si es necesario",
        "Form I-693 completed, signed, and sealed": "Formulario I-693 completado, firmado y sellado",
        "in a tamper-proof envelope": "en un sobre a prueba de manipulación",
        "Personal copy provided": "Copia personal provista",
        "for your records": "para sus registros",
        "Bring Form I-693 to your second visit": "Traiga el Formulario I-693 a su segunda visita",
        "with Part 1 completed. Do not sign it until Dr. Kessous instructs you to do so. Blank copies are available at our office if you don't have one.":
            "con la Parte 1 completada. No lo firme hasta que el Dr. Kessous le indique hacerlo. Hay copias en blanco disponibles en nuestra oficina si no tiene una.",
        "USCIS requires applicants to be vaccinated against certain diseases per":
            "USCIS requiere que los solicitantes estén vacunados contra ciertas enfermedades según las",
        "CDC technical instructions": "instrucciones técnicas del CDC",
        ". If your vaccination records show you've already received them, you will not need to repeat them. If records are unavailable or incomplete, we can administer the required vaccines during your visit.":
            ". Si sus registros de vacunación muestran que ya las ha recibido, no necesitará repetirlas. Si los registros no están disponibles o están incompletos, podemos administrar las vacunas requeridas durante su visita.",

        // ── FAA Physicals page — detailed strings ──
        "Dr. Efraim Kessous is an FAA-authorized": "El Dr. Efraim Kessous es un",
        "Senior Aviation Medical Examiner (AME)": "Examinador Médico de Aviación Senior (AME) autorizado por la FAA",
        "performing Class 1, 2, and 3 medical exams. Use the resources below to prepare for your visit and avoid unnecessary deferrals.":
            "que realiza exámenes médicos de Clase 1, 2 y 3. Use los recursos a continuación para prepararse para su visita y evitar aplazamientos innecesarios.",
        "Medical Classes": "Clases Médicas",
        "New vs. Returning": "Nuevos vs. Que Regresan",
        "Checklist": "Lista de Verificación",
        "Medications": "Medicamentos",
        "CACI": "CACI",
        "Official Resources": "Recursos Oficiales",
        "Book Your FAA Physical": "Reserve Su Examen Físico FAA",
        "Call (301) 208-2273": "Llamar (301) 208-2273",
        "The FAA issues three classes of medical certificates. The class you need depends on how you fly. Montgomery Medical Clinic performs all three classes.":
            "La FAA emite tres clases de certificados médicos. La clase que necesita depende de cómo vuele. Montgomery Medical Clinic realiza las tres clases.",
        "Guidance for New & Returning Pilots": "Guía para Pilotos Nuevos y que Regresan",
        "Whether this is your first FAA medical or your twentieth renewal, the requirements are different. Select your situation below.":
            "Ya sea que este sea su primer examen médico FAA o su vigésima renovación, los requisitos son diferentes. Seleccione su situación a continuación.",
        "First-Time / Student Pilots": "Pilotos por Primera Vez / Estudiantes",
        "Returning / Experienced Pilots": "Pilotos que Regresan / Experimentados",
        "Getting Started": "Comenzar",
        "Choose your class wisely. If you plan to pursue an airline career, consider applying for a Class 1 from the start. This identifies any disqualifying conditions early, before you invest heavily in flight training.":
            "Elija su clase sabiamente. Si planea una carrera en aerolíneas, considere aplicar para la Clase 1 desde el principio. Esto identifica cualquier condición descalificante temprano, antes de invertir mucho en el entrenamiento de vuelo.",
        "Create a MedXPress account. Go to medxpress.faa.gov and complete Form 8500-8 online. This is mandatory before your exam. Your application is valid for 60 days.":
            "Cree una cuenta MedXPress. Vaya a medxpress.faa.gov y complete el Formulario 8500-8 en línea. Esto es obligatorio antes de su examen. Su solicitud es válida por 60 días.",
        "Gather your records. You'll need your full medical history, a list of physician visits for the last 3 years, and a list of all current medications (including OTC and supplements).":
            "Reúna sus registros. Necesitará su historial médico completo, una lista de visitas médicas de los últimos 3 años y una lista de todos los medicamentos actuales (incluyendo medicamentos de venta libre y suplementos).",
        "Pre-check your color vision. First-time applicants will undergo a computerized color vision test. If you know you have color vision issues, discuss this with our office beforehand.":
            "Verifique previamente su visión de color. Los solicitantes por primera vez se someterán a una prueba computarizada de visión de color. Si sabe que tiene problemas de visión de color, hable con nuestra oficina de antemano.",
        "What to Expect at Your First Exam": "Qué Esperar en Su Primer Examen",
        "Vision test": "Prueba de visión",
        "— distance, near, and color vision": "— visión a distancia, cercana y de colores",
        "Hearing test": "Prueba de audición",
        "— conversational voice or audiometric": "— voz conversacional o audiométrica",
        "Urine sample": "Muestra de orina",
        "— screening for sugar and protein": "— detección de azúcar y proteína",
        "Blood pressure & pulse": "Presión arterial y pulso",
        "General physical exam": "Examen físico general",
        "— heart, lungs, abdomen, neuro": "— corazón, pulmones, abdomen, neurológico",
        "EKG": "EKG",
        "— required for Class 1 at age 35 and annually after 40": "— requerido para Clase 1 a los 35 años y anualmente después de los 40",
        "Medical history review": "Revisión del historial médico",
        "— the AME reviews your 8500-8 with you": "— el AME revisa su 8500-8 con usted",
        "Tip for parents:": "Consejo para padres:",
        "If you accompany your child for their first student pilot exam, you cannot complete the MedXPress application on their behalf. The FAA requires the applicant to complete their own application.":
            "Si acompaña a su hijo para su primer examen de piloto estudiante, no puede completar la solicitud MedXPress en su nombre. La FAA requiere que el solicitante complete su propia solicitud.",

        // ── Occupational / Corporate Health page — detailed strings ──
        "Dr. Efraim Kessous, MPH is a board-certified Occupational Medicine physician partnering with businesses across Maryland to deliver comprehensive occupational health and workplace wellness programs. Our services follow OSHA medical surveillance standards and are fully tailored to your industry's requirements.":
            "El Dr. Efraim Kessous, MPH, es un médico certificado en Medicina Ocupacional que se asocia con empresas en todo Maryland para brindar programas integrales de salud ocupacional y bienestar en el lugar de trabajo. Nuestros servicios siguen los estándares de vigilancia médica de OSHA y están totalmente adaptados a los requisitos de su industria.",

        // ── Batch 2: inline-split text-node fragments discovered in verification ──
        // Page titles (<title> tags)
        "Insurance Plans Accepted | Gaithersburg, MD — Aetna, BCBS, Cigna, Medicare & More | Montgomery Medical Clinic":
            "Planes de Seguro Aceptados | Gaithersburg, MD — Aetna, BCBS, Cigna, Medicare y Más | Montgomery Medical Clinic",
        "About Us - Our Doctors & Healthcare Team | Montgomery Medical Clinic Gaithersburg, MD":
            "Sobre Nosotros - Nuestros Médicos y Equipo de Salud | Montgomery Medical Clinic Gaithersburg, MD",
        "Urgent Care & Primary Care Physicians in Gaithersburg, MD | Montgomery Medical Clinic":
            "Médicos de Atención Urgente y Primaria en Gaithersburg, MD | Montgomery Medical Clinic",
        "Urgent Care & Primary Care": "Atención Urgente y Primaria",
        "Immigration Physicals — I-693 USCIS Medical Exam by Authorized Civil Surgeon | Montgomery Medical Clinic":
            "Exámenes Físicos de Inmigración — Examen Médico I-693 USCIS por Cirujano Civil Autorizado | Montgomery Medical Clinic",
        "FAA Medical Exam & Aviation Physical - AME in Gaithersburg, MD | Montgomery Medical Clinic":
            "Examen Médico FAA y Físico de Aviación - AME en Gaithersburg, MD | Montgomery Medical Clinic",
        "FAA Medical Exams & Aviation Physicals": "Exámenes Médicos FAA y Físicos de Aviación",
        "Occupational Health Services in Gaithersburg, MD — Pre-Employment, Drug Testing & Workplace Wellness | Montgomery Medical Clinic":
            "Servicios de Salud Ocupacional en Gaithersburg, MD — Pre-Empleo, Pruebas de Drogas y Bienestar Laboral | Montgomery Medical Clinic",

        // Insurance carrier names → keep brand, localize generic suffixes
        "Blue Cross Blue Shield / CareFirst": "Blue Cross Blue Shield / CareFirst",
        "Multiplan / PHCS": "Multiplan / PHCS",
        "UnitedHealthcare": "UnitedHealthcare",
        "Tricare (Military)": "Tricare (Militar)",
        "Amerigroup / Wellpoint": "Amerigroup / Wellpoint",
        "CareFirst Community Health Plan": "CareFirst Community Health Plan",
        "Johns Hopkins US Family Health": "Johns Hopkins US Family Health",
        "Aetna, BlueCross BlueShield (CareFirst), Cigna, UnitedHealthcare":
            "Aetna, BlueCross BlueShield (CareFirst), Cigna, UnitedHealthcare",
        "Medicare, Medicaid, Priority Partners, Amerigroup":
            "Medicare, Medicaid, Priority Partners, Amerigroup",

        // About page – physician name is a proper noun (keep), but leave translation present for round-trip safety
        "Dr. Marsha D. Mitchum": "Dra. Marsha D. Mitchum",

        // Immigration page fragments
        "After the Exam": "Después del Examen",
        "Dr. Efraim Kessous is a": "El Dr. Efraim Kessous es un",
        "authorized to perform immigration medical examinations and complete Form I-693 for green card applicants.":
            "autorizado para realizar exámenes médicos de inmigración y completar el Formulario I-693 para solicitantes de tarjeta verde.",
        "(Measles, Mumps, Rubella)": "(Sarampión, Paperas, Rubéola)",
        "All applicants born after 1957": "Todos los solicitantes nacidos después de 1957",
        "Hepatitis B": "Hepatitis B",
        "Hepatitis A": "Hepatitis A",
        "All applicants": "Todos los solicitantes",
        "(Chickenpox)": "(Varicela)",
        "(Tetanus, Diphtheria, Pertussis)": "(Tétanos, Difteria, Tos ferina)",
        "All applicants age 2+": "Todos los solicitantes mayores de 2 años",
        "All applicants age 6 months+": "Todos los solicitantes mayores de 6 meses",
        "Required during flu season (October&ndash;March)":
            "Requerido durante la temporada de gripe (octubre–marzo)",
        "Required during flu season (October–March)":
            "Requerido durante la temporada de gripe (octubre–marzo)",
        "Per current CDC recommendations": "Según las recomendaciones actuales de los CDC",
        "Ages 2&ndash;4 and 65+": "Edades 2–4 y 65+",
        "Ages 2–4 and 65+": "Edades 2–4 y 65+",
        "Age-appropriate series": "Serie apropiada para la edad",
        "Ages 2 months &ndash; 17 years": "De 2 meses a 17 años",
        "Ages 2 months – 17 years": "De 2 meses a 17 años",
        "Infants 6 weeks &ndash; 8 months": "Bebés de 6 semanas a 8 meses",
        "Infants 6 weeks – 8 months": "Bebés de 6 semanas a 8 meses",
        "(Haemophilus influenzae type b)": "(Haemophilus influenzae tipo b)",
        "Ages 2 months &ndash; 4 years": "De 2 meses a 4 años",
        "Ages 2 months – 4 years": "De 2 meses a 4 años",
        "Ages 12 months &ndash; 23 months": "De 12 a 23 meses",
        "Ages 12 months – 23 months": "De 12 a 23 meses",
        "Requirements are age-dependent and may change. See the":
            "Los requisitos dependen de la edad y pueden cambiar. Consulte las",
        "CDC Vaccination Technical Instructions":
            "Instrucciones Técnicas de Vacunación de los CDC",
        "for full details.": "para obtener todos los detalles.",
        "Having your vaccination records can help": "Tener sus registros de vacunación puede ayudar a",
        "avoid unnecessary repeat vaccinations": "evitar vacunaciones repetidas innecesarias",
        "and reduce costs. If your records are in a language other than English, they must be translated by a professional translator. We can help arrange translation if needed.":
            "y reducir costos. Si sus registros están en un idioma distinto al inglés, deben ser traducidos por un traductor profesional. Podemos ayudar a organizar la traducción si es necesario.",
        "Once your exam is complete, here's what to expect for receiving and submitting your I-693 paperwork.":
            "Una vez completado su examen, esto es lo que puede esperar para recibir y presentar su documentación I-693.",
        "If all test results come back normal, expect a call within":
            "Si todos los resultados de las pruebas son normales, espere una llamada dentro de",
        "to let you know the paperwork is ready to collect.":
            "para informarle que la documentación está lista para recoger.",
        "Your Form I-693 will be completed, signed, and sealed in a":
            "Su Formulario I-693 será completado, firmado y sellado en un",
        "tamper-proof envelope": "sobre a prueba de manipulaciones",
        ". You'll receive a personal copy for your records.":
            ". Recibirá una copia personal para sus registros.",
        "USCIS will": "USCIS",
        "not accept": "no aceptará",
        "Form I-693 if the sealed envelope is opened, altered, or the seal is broken in any way.":
            "el Formulario I-693 si el sobre sellado se abre, altera o el sello se rompe de alguna manera.",
        "Submit the sealed I-693 envelope to USCIS along with your":
            "Presente el sobre sellado I-693 a USCIS junto con su",
        "(Application to Register Permanent Residence or Adjust Status). Form I-693 is valid for":
            "(Solicitud para Registrar Residencia Permanente o Ajuste de Estatus). El Formulario I-693 es válido por",
        "from the date the civil surgeon signs it. If your results require further evaluation or treatment, we will contact you with next steps before completing your I-693.":
            "a partir de la fecha en que el cirujano civil lo firma. Si sus resultados requieren evaluación o tratamiento adicional, lo contactaremos con los próximos pasos antes de completar su I-693.",

        // FAA page fragments
        "Pre-visit checklist, medical certificate classes & validity table, medication lookup, CACI condition worksheets, and guidance for new and returning pilots.":
            "Lista de verificación previa a la visita, clases de certificados médicos y tabla de validez, búsqueda de medicamentos, hojas de trabajo de condiciones CACI y orientación para pilotos nuevos y recurrentes.",
        "Common questions about FAA medical exams at Montgomery Medical Clinic.":
            "Preguntas comunes sobre los exámenes médicos de la FAA en Montgomery Medical Clinic.",
        "Montgomery Medical Clinic has an FAA-authorized":
            "Montgomery Medical Clinic cuenta con un",
        "Aviation Medical Examiner (AME)": "Examinador Médico de Aviación (AME)",
        "on staff.": "autorizado por la FAA en su personal.",
        "We perform Class 1, Class 2, and Class 3 FAA medical examinations for pilots, student pilots, and aviation professionals in Gaithersburg, MD.":
            "Realizamos exámenes médicos FAA de Clase 1, Clase 2 y Clase 3 para pilotos, estudiantes de piloto y profesionales de la aviación en Gaithersburg, MD.",
        "What is the difference between Class 1, Class 2, and Class 3 FAA physicals?":
            "¿Cuál es la diferencia entre los exámenes físicos FAA de Clase 1, Clase 2 y Clase 3?",
        "Class 1": "Clase 1",
        "Class 2": "Clase 2",
        "Class 3": "Clase 3",
        "— Required for airline transport pilots (ATPs)":
            "— Requerido para pilotos de transporte aéreo (ATP)",
        "— Required for commercial pilots": "— Requerido para pilotos comerciales",
        "— Required for private and recreational pilots":
            "— Requerido para pilotos privados y recreativos",
        "Each class has different medical standards and renewal intervals. Our AME can guide you on which class you need.":
            "Cada clase tiene diferentes estándares médicos e intervalos de renovación. Nuestro AME puede guiarlo sobre qué clase necesita.",
        "What do I need to bring to my FAA physical?":
            "¿Qué necesito traer a mi examen físico FAA?",
        "Please bring the following to your appointment:":
            "Por favor traiga lo siguiente a su cita:",
        "Valid photo ID": "Identificación con foto válida",
        "FAA MedXPress confirmation number (complete the application at":
            "Número de confirmación de FAA MedXPress (complete la solicitud en",
        "MedXPress.FAA.gov": "MedXPress.FAA.gov",
        "before your visit)": "antes de su visita)",
        "List of current medications": "Lista de medicamentos actuales",
        "Any relevant medical records": "Cualquier registro médico relevante",
        "Corrective lenses, if you wear them": "Lentes correctivos, si los usa",
        "How long does an FAA medical exam take?":
            "¿Cuánto dura un examen médico FAA?",
        "A standard FAA medical exam typically takes":
            "Un examen médico FAA estándar generalmente toma",
        ", depending on the class of physical and your medical history.":
            ", dependiendo de la clase de examen físico y su historial médico.",
        "If additional testing is needed, it may take longer.":
            "Si se necesitan pruebas adicionales, puede tomar más tiempo.",
        "FAA medical exams are": "Los exámenes médicos FAA",
        "generally not covered": "generalmente no están cubiertos",
        "by insurance, as they are considered regulatory physicals rather than diagnostic medical visits.":
            "por el seguro, ya que se consideran exámenes físicos regulatorios en lugar de visitas médicas diagnósticas.",
        "We offer competitive self-pay pricing. Call":
            "Ofrecemos precios competitivos para pago propio. Llame al",
        "for current rates.": "para conocer las tarifas actuales.",

        // Occupational health fragments
        "Dr. Efraim Kessous, MPH": "Dr. Efraim Kessous, MPH",
        "Dr. Efraim Kessous — USCIS Authorized Civil Surgeon":
            "Dr. Efraim Kessous — Cirujano Civil Autorizado por USCIS",
        "Dr. Efraim Kessous — Senior Aviation Medical Examiner (AME)":
            "Dr. Efraim Kessous — Examinador Médico de Aviación Senior (AME)",
        "Dr. Efraim Kessous — Licensed Physician":
            "Dr. Efraim Kessous — Médico con Licencia",
        "Dr. Efraim Kessous, MPH — Board-Certified Occupational Medicine Physician":
            "Dr. Efraim Kessous, MPH — Médico de Medicina Ocupacional Certificado",
        "If you're applying for a green card,": "Si está solicitando una tarjeta verde,",
        "requires a medical examination and": "requiere un examen médico y",
        "completed by an authorized civil surgeon. The exam screens for communicable diseases and verifies your vaccinations per":
            "completado por un cirujano civil autorizado. El examen detecta enfermedades transmisibles y verifica sus vacunas según",
        "If all test results come back normal, expect a call within":
            "Si todos los resultados de las pruebas son normales, espere una llamada dentro de",
        "to collect your signed and sealed I-693 paperwork. Submit the sealed envelope to USCIS with your":
            "para recoger su documentación I-693 firmada y sellada. Presente el sobre sellado a USCIS con su",
        "application.": "solicitud.",
        "USCIS civil surgeon directory": "Directorio de cirujanos civiles de USCIS",
        "Full I-693 exam process, required vaccinations, what to expect at each visit, and answers to common questions — all in one dedicated page.":
            "Proceso completo del examen I-693, vacunas requeridas, qué esperar en cada visita y respuestas a preguntas comunes — todo en una página dedicada.",
        "requires all pilots to pass a medical examination with an authorized":
            "requiere que todos los pilotos aprueben un examen médico con un",
        ". The exam evaluates your physical and mental fitness to operate an aircraft.":
            ". El examen evalúa su aptitud física y mental para operar una aeronave.",
        "Complete your": "Complete su",
        "FAA MedXPress": "FAA MedXPress",
        "form before your appointment. Expect hearing, vision, and urine tests, plus an ECG for first-class certificates.":
            "formulario antes de su cita. Espere pruebas de audición, visión y orina, además de un ECG para certificados de primera clase.",
        "Frequency depends on your certificate class and age — ranging from every 6 months to every 60 months. See the":
            "La frecuencia depende de la clase de su certificado y su edad, que va desde cada 6 meses hasta cada 60 meses. Consulte las",
        "FAA medical certification FAQ": "Preguntas frecuentes sobre la certificación médica FAA",
        "Montgomery Medical Clinic is proud to work with the":
            "Montgomery Medical Clinic se enorgullece de trabajar con",
        "in Washington, DC — providing FAA physicals for their student and professional pilots.":
            "en Washington, DC, proporcionando exámenes físicos FAA para sus pilotos estudiantes y profesionales.",
        "Pre-visit checklist, medical certificate classes, medication lookup, CACI condition worksheets, and guidance for new & returning pilots — all in one place.":
            "Lista de verificación previa a la visita, clases de certificados médicos, búsqueda de medicamentos, hojas de trabajo de condiciones CACI y orientación para pilotos nuevos y recurrentes — todo en un solo lugar.",
        "Montgomery Medical Clinic partners with businesses across Maryland to deliver comprehensive occupational health and workplace wellness programs. Our services follow":
            "Montgomery Medical Clinic se asocia con empresas en todo Maryland para brindar programas integrales de salud ocupacional y bienestar en el lugar de trabajo. Nuestros servicios siguen",
        "OSHA medical surveillance standards": "los estándares de vigilancia médica de OSHA",
        "and are fully tailored to your industry's requirements.":
            "y están totalmente adaptados a los requisitos de su industria.",
        "Thorough pre-hire examinations and drug testing that ensure new team members are ready for the demands of their specific roles — so every employee starts on solid footing.":
            "Exámenes exhaustivos previos a la contratación y pruebas de drogas que aseguran que los nuevos miembros del equipo estén listos para las demandas de sus roles específicos, de modo que cada empleado comience con pie firme.",
        "Maryland WCC": "Maryland WCC",
        "Bring healthcare directly to your workplace with":
            "Lleve la atención médica directamente a su lugar de trabajo con",
        "seasonal flu shots": "vacunas estacionales contra la gripe",
        ", health screenings, and quick check-ups — keeping your team healthy with minimal time away from work.":
            ", evaluaciones de salud y chequeos rápidos, manteniendo a su equipo saludable con el mínimo tiempo fuera del trabajo.",
        "Comprehensive evaluations confirming employees are physically ready to resume their duties after illness or injury, with clear documented clearance.":
            "Evaluaciones integrales que confirman que los empleados están físicamente listos para reanudar sus funciones después de una enfermedad o lesión, con autorización claramente documentada.",
        "OSHA-compliant surveillance protocols": "Protocolos de vigilancia que cumplen con OSHA",
        "CDC-recommended vaccinations": "Vacunas recomendadas por los CDC",
        "for corporate, laboratory, and pharmaceutical environments with biological or chemical hazards.":
            "para entornos corporativos, de laboratorio y farmacéuticos con riesgos biológicos o químicos.",
        "Pre-employment physicals, OSHA surveillance programs, workers' comp care, respirator fit testing, drug screening, and on-site wellness — everything your workforce needs.":
            "Exámenes físicos previos al empleo, programas de vigilancia de OSHA, atención de compensación laboral, pruebas de ajuste de respiradores, detección de drogas y bienestar en el sitio — todo lo que su fuerza laboral necesita.",
        "If you've been charged with a DUI, the": "Si ha sido acusado de DUI, el",

        // ── Batch 3: immigration & occupational residual fragments ──
        "from the date the civil surgeon signs it. If your results require further evaluation or treatment, we will contact you with next steps before completing the form.":
            "a partir de la fecha en que el cirujano civil lo firma. Si sus resultados requieren evaluación o tratamiento adicional, lo contactaremos con los próximos pasos antes de completar el formulario.",
        "Find USCIS-designated civil surgeons near you using the official myUSCIS search tool.":
            "Encuentre cirujanos civiles designados por USCIS cerca de usted utilizando la herramienta oficial de búsqueda myUSCIS.",
        "Technical instructions for vaccination requirements during the immigration medical examination.":
            "Instrucciones técnicas para los requisitos de vacunación durante el examen médico de inmigración.",
        "Official USCIS page for Form I-693 — Report of Medical Examination and Vaccination Record.":
            "Página oficial de USCIS para el Formulario I-693 — Informe de Examen Médico y Registro de Vacunación.",
        "Application to Register Permanent Residence or Adjust Status — where your sealed I-693 is submitted.":
            "Solicitud para Registrar Residencia Permanente o Ajuste de Estatus — donde se presenta su I-693 sellado.",
        "Official USCIS guidance on finding a designated civil surgeon and completing your medical forms.":
            "Orientación oficial de USCIS sobre cómo encontrar un cirujano civil designado y completar sus formularios médicos.",
        "CDC technical instructions for civil surgeons performing immigration medical exams.":
            "Instrucciones técnicas de los CDC para cirujanos civiles que realizan exámenes médicos de inmigración.",
        "is the Report of Medical Examination and Vaccination Record required by USCIS for green card (adjustment of status) applicants.":
            "es el Informe de Examen Médico y Registro de Vacunación requerido por USCIS para solicitantes de tarjeta verde (ajuste de estatus).",
        "It must be completed by a USCIS-designated civil surgeon. Dr. Efraim Kessous at Montgomery Medical Clinic is an":
            "Debe ser completado por un cirujano civil designado por USCIS. El Dr. Efraim Kessous en Montgomery Medical Clinic es un",
        "authorized civil surgeon": "cirujano civil autorizado",
        "listed in the USCIS directory and fully qualified to perform these exams.":
            "incluido en el directorio de USCIS y totalmente calificado para realizar estos exámenes.",
        "The exam includes:": "El examen incluye:",
        "Complete physical examination by a civil surgeon":
            "Examen físico completo por un cirujano civil",
        "Review of vaccination records against CDC requirements":
            "Revisión de registros de vacunación según los requisitos de los CDC",
        "Tuberculosis (TB) blood test (IGRA)":
            "Análisis de sangre de tuberculosis (TB) (IGRA)",
        "Syphilis blood test (ages 15+)":
            "Análisis de sangre de sífilis (mayores de 15 años)",
        "Gonorrhea urine test (ages 15+)":
            "Análisis de orina de gonorrea (mayores de 15 años)",
        "Any vaccinations needed to meet USCIS requirements":
            "Cualquier vacuna necesaria para cumplir con los requisitos de USCIS",
        "We complete all lab work during": "Completamos todo el trabajo de laboratorio durante",
        "your first visit": "su primera visita",
        "so results are ready for the physical exam on your second visit.":
            "para que los resultados estén listos para el examen físico en su segunda visita.",
        "The process typically requires": "El proceso generalmente requiere",
        "First visit:": "Primera visita:",
        "All lab work (blood tests, TB screening, urine tests) and vaccination records review":
            "Todo el trabajo de laboratorio (análisis de sangre, detección de TB, análisis de orina) y revisión de registros de vacunación",
        "Second visit:": "Segunda visita:",
        "Physical examination, results review, vaccinations if needed, and completion of Form I-693":
            "Examen físico, revisión de resultados, vacunaciones si es necesario y finalización del Formulario I-693",
        "If all test results come back normal, you can typically expect a call within":
            "Si todos los resultados de las pruebas son normales, normalmente puede esperar una llamada dentro de",
        "Results that require additional follow-up or treatment may take longer. We will contact you promptly with next steps if this is the case.":
            "Los resultados que requieren seguimiento o tratamiento adicional pueden tardar más. Lo contactaremos rápidamente con los próximos pasos si este es el caso.",
        "Please bring the following:": "Por favor traiga lo siguiente:",
        "Valid government-issued photo ID (passport, driver's license, or state ID)":
            "Identificación con foto emitida por el gobierno válida (pasaporte, licencia de conducir o identificación estatal)",
        "Vaccination records (translated into English if needed)":
            "Registros de vacunación (traducidos al inglés si es necesario)",
        "List of current medications with dosages":
            "Lista de medicamentos actuales con dosis",
        "Any previous TB test or STI screening results":
            "Cualquier resultado previo de prueba de TB o detección de ITS",
        "USCIS appointment letter or I-693 instructions (if applicable)":
            "Carta de cita de USCIS o instrucciones I-693 (si aplica)",
        "Having complete vaccination records can help":
            "Tener registros de vacunación completos puede ayudar a",
        "and reduce costs.": "y reducir costos.",
        "USCIS will not accept Form I-693 if the envelope is opened, altered, or the seal is broken in any way. You will receive a":
            "USCIS no aceptará el Formulario I-693 si el sobre se abre, altera o el sello se rompe de alguna manera. Recibirá una",
        "personal copy": "copia personal",
        "of your results for your records, but the official sealed envelope must be submitted intact with your I-485 application.":
            "de sus resultados para sus registros, pero el sobre oficial sellado debe presentarse intacto con su solicitud I-485.",
        "Immigration physicals are": "Los exámenes físicos de inmigración",
        "by insurance, as they are classified as regulatory screening exams. Rates vary by civil surgeon. USCIS does not regulate fees.":
            "por el seguro, ya que se clasifican como exámenes de detección regulatorios. Las tarifas varían según el cirujano civil. USCIS no regula las tarifas.",
        "Montgomery Medical Clinic offers competitive self-pay pricing. Call":
            "Montgomery Medical Clinic ofrece precios competitivos para pago propio. Llame al",
        "for current pricing information.": "para obtener información actual sobre precios.",
        "Form I-693 is valid for": "El Formulario I-693 es válido por",
        "from the date the civil surgeon signs it. USCIS must receive the form within this window. If the form expires before your case is adjudicated, you may need to undergo a new medical examination.":
            "a partir de la fecha en que el cirujano civil lo firma. USCIS debe recibir el formulario dentro de este plazo. Si el formulario caduca antes de que se adjudique su caso, es posible que deba someterse a un nuevo examen médico.",
        "If your exam reveals a medical condition that could affect your admissibility — such as a communicable disease — you may be asked to provide additional documentation or undergo further evaluation. Some conditions may require treatment before the I-693 can be completed.":
            "Si su examen revela una condición médica que podría afectar su admisibilidad — como una enfermedad transmisible — se le puede pedir que proporcione documentación adicional o que se someta a una evaluación adicional. Algunas condiciones pueden requerir tratamiento antes de que se pueda completar el I-693.",
        "In certain cases, you may be eligible to apply for a":
            "En ciertos casos, puede ser elegible para solicitar una",
        "waiver of inadmissibility": "exención de inadmisibilidad",
        ". Dr. Kessous will explain your options and help guide you through the process.":
            ". El Dr. Kessous le explicará sus opciones y le ayudará a guiarlo a través del proceso.",

        // Occupational health batch-3
        "Thorough pre-hire examinations and drug testing that ensure new team members are ready for the demands of their specific roles — so every employee is safe and fit for duty from day one.":
            "Exámenes exhaustivos previos a la contratación y pruebas de drogas que aseguran que los nuevos miembros del equipo estén listos para las demandas de sus roles específicos, de modo que cada empleado esté seguro y apto para el servicio desde el primer día.",
        "Comprehensive evaluations confirming employees are physically ready to resume their duties after illness or injury, with clear documented clearance aligned with job requirements.":
            "Evaluaciones integrales que confirman que los empleados están físicamente listos para reanudar sus funciones después de una enfermedad o lesión, con una autorización claramente documentada alineada con los requisitos del trabajo.",
        "Pre-visit checklist, medical certificate classes, medication lookup, CACI condition worksheets, and guidance for new & returning pilots — all in one page.":
            "Lista de verificación previa a la visita, clases de certificados médicos, búsqueda de medicamentos, hojas de trabajo de condiciones CACI y orientación para pilotos nuevos y recurrentes, todo en una sola página.",
        "Pre-employment physicals, OSHA surveillance programs, workers' comp care, respirator fit testing, drug screening, and on-site wellness — everything your business needs in one dedicated page.":
            "Exámenes físicos previos al empleo, programas de vigilancia de OSHA, atención de compensación laboral, pruebas de ajuste de respiradores, detección de drogas y bienestar en el sitio — todo lo que su negocio necesita en una página dedicada.",
        "Maryland Motor Vehicle Administration (MVA)": "Administración de Vehículos Motorizados de Maryland (MVA)",
        "may require a physical examination with a licensed physician before your driving privileges can be reinstated.":
            "puede requerir un examen físico con un médico con licencia antes de que se puedan restablecer sus privilegios de conducir.",
        "Dr. Kessous conducts DUI physical evaluations in accordance with":
            "El Dr. Kessous realiza evaluaciones físicas por DUI de acuerdo con",
        "Maryland MVA medical requirements": "los requisitos médicos de MVA de Maryland",
        ". The exam reviews your physical and mental fitness to safely operate a motor vehicle.":
            ". El examen revisa su aptitud física y mental para operar un vehículo motorizado de manera segura.",
        ", we provide workplace drug testing including:":
            ", proporcionamos pruebas de drogas en el lugar de trabajo, incluyendo:",
        "Contact us at": "Contáctenos al",
        "scheduling an appointment": "programar una cita",
        "or book online to reserve your spot.": "o reserve en línea para asegurar su lugar.",
        "Class 1, Class 2, and Class 3": "Clase 1, Clase 2 y Clase 3",
        "Visit our": "Visite nuestra",
        "FAA Physicals page": "página de Exámenes Físicos FAA",
        "Pre-visit checklist, medical certificate classes & validity table, medication lookup, CACI condition worksheets, and guidance for new and returning pilots — everything in one place.":
            "Lista de verificación previa a la visita, clases de certificados médicos y tabla de validez, búsqueda de medicamentos, hojas de trabajo de condiciones CACI y orientación para pilotos nuevos y recurrentes — todo en un solo lugar.",

        // FAA pilot resources residual coverage
        "Pilot Resources": "Recursos para Pilotos",
        "The FAA issues three classes of medical certificates. The class you need depends on how you fly. Montgomery Medical Clinic performs":
            "La FAA emite tres clases de certificados médicos. La clase que necesita depende de cómo vuele. Montgomery Medical Clinic realiza",
        "all three classes": "las tres clases",
        "Required for pilots exercising Airline Transport Pilot privileges - flying as pilot-in-command in scheduled air carrier operations. This is the":
            "Requerido para pilotos que ejercen privilegios de Piloto de Transporte Aéreo - volando como piloto al mando en operaciones programadas de aerolíneas. Este es el",
        "highest medical standard": "estándar médico más alto",
        "Most comprehensive examination": "Examen más completo",
        "Required for commercial operations outside of airline flying - flight instructors, charter pilots, crop dusters, and other commercial certificate holders.":
            "Requerido para operaciones comerciales fuera del vuelo de aerolíneas - instructores de vuelo, pilotos chárter, aplicadores aéreos y otros titulares de certificados comerciales.",
        "Moderate medical standards": "Estándares médicos moderados",
        "No routine EKG requirement": "Sin requisito rutinario de EKG",
        "Same validity period regardless of age": "Mismo período de validez independientemente de la edad",
        "Required for private, recreational, and student pilots. This is the":
            "Requerido para pilotos privados, recreativos y estudiantes. Este es el",
        "lowest medical standard": "estándar médico más bajo",
        "and the most common starting point for new pilots.":
            "y el punto de partida más común para pilotos nuevos.",
        "Basic physical & mental health screening": "Evaluación básica de salud física y mental",
        "Longest validity period": "Período de validez más largo",
        "Great starting point for student pilots": "Excelente punto de partida para pilotos estudiantes",
        "Validity Table": "Tabla de Validez",
        "Commercial Pilot": "Piloto Comercial",
        "1st Class": "Clase 1",
        "2nd Class": "Clase 2",
        "3rd Class": "Clase 3",
        "Private / Student Pilot": "Piloto Privado / Estudiante",
        "12 months": "12 meses",
        "6 months": "6 meses",
        "60 months": "60 meses",
        "(5 years)": "(5 años)",
        "24 months": "24 meses",
        "(2 years)": "(2 años)",
        "The validity \"clock\" starts on the last day of the month the exam was performed.":
            "El \"conteo\" de validez comienza el último día del mes en que se realizó el examen.",
        "The \"Step-Down\" Rule - Don't Ground Yourself":
            "La \"Regla de Reducción\" - No se deje en tierra",
        "Choose your class wisely.": "Elija su clase sabiamente.",
        "If you plan to pursue an airline career, consider applying for a Class 1 from the start. This identifies any disqualifying conditions early, before you invest heavily in flight training.":
            "Si planea seguir una carrera en aerolíneas, considere solicitar una Clase 1 desde el principio. Esto identifica cualquier condición descalificante temprano, antes de invertir mucho en el entrenamiento de vuelo.",
        "Create a MedXPress account.": "Cree una cuenta de MedXPress.",
        "Go to": "Vaya a",
        "and complete Form 8500-8 online. This is":
            "y complete el Formulario 8500-8 en línea. Esto es",
        "before your exam. Your application is valid for 60 days.":
            "antes de su examen. Su solicitud es válida por 60 días.",
        "Gather your records.": "Reúna sus registros.",
        "You'll need your full medical history, a list of physician visits for the last 3 years, and a list of all current medications (including OTC and supplements).":
            "Necesitará su historial médico completo, una lista de visitas médicas de los últimos 3 años y una lista de todos los medicamentos actuales (incluyendo medicamentos de venta libre y suplementos).",
        "Pre-check your color vision.": "Verifique su visión de colores con anticipación.",
        "First-time applicants will undergo a computerized color vision test. If you know you have color vision issues, discuss this with our office beforehand.":
            "Los solicitantes por primera vez se someterán a una prueba computarizada de visión de colores. Si sabe que tiene problemas de visión de colores, hable con nuestra oficina de antemano.",
        "Check your renewal date.": "Verifique su fecha de renovación.",
        "Your certificate validity depends on your class and age (see the":
            "La validez de su certificado depende de su clase y edad (vea la",
        "validity table above": "tabla de validez arriba",
        "). The clock starts the last day of the month of your exam.":
            "). El conteo comienza el último día del mes de su examen.",
        "Update MedXPress.": "Actualice MedXPress.",
        "Report all physician visits since your last exam - this includes physicians, PAs, NPs, psychologists, and chiropractors. Include the date, name, address, and reason. Routine dental and standard eye exams (unless for a condition like glaucoma) can be omitted.":
            "Informe todas las visitas médicas desde su último examen - esto incluye médicos, asistentes médicos, enfermeros practicantes, psicólogos y quiroprácticos. Incluya la fecha, el nombre, la dirección y el motivo. Los exámenes dentales de rutina y los exámenes oculares estándar (a menos que sean por una condición como glaucoma) pueden omitirse.",
        "Complete these steps before your appointment to ensure a smooth exam and avoid unnecessary delays or deferrals.":
            "Complete estos pasos antes de su cita para asegurar un examen sin contratiempos y evitar retrasos o aplazamientos innecesarios.",
        "Complete MedXPress online (mandatory).": "Complete MedXPress en línea (obligatorio).",
        "Fill out your FAA medical application (Form 8500-8) at":
            "Complete su solicitud médica FAA (Formulario 8500-8) en",
        "before your visit. Bring your": "antes de su visita. Traiga su",
        "Confirmation Number": "Número de Confirmación",
        "printed copy": "copia impresa",
        "of the 8500-8. The application is valid for 60 days.":
            "del 8500-8. La solicitud es válida por 60 días.",
        "Bring required identification.": "Traiga la identificación requerida.",
        "Government-issued photo ID, pilot's license (if renewal), and your previous medical certificate. If you have a Special Issuance letter or waiver, bring it along with all documentation outlined in the letter.":
            "Identificación con foto emitida por el gobierno, licencia de piloto (si es renovación) y su certificado médico previo. Si tiene una carta o exención de Emisión Especial, tráigala junto con toda la documentación indicada en la carta.",
        "Be at your best.": "Preséntese en su mejor estado.",
        "Arrive well-rested and well-hydrated (you will need to provide a urine sample). Avoid alcohol, caffeine, excess sodium, sugar, and large portions of carbohydrates for at least":
            "Llegue bien descansado y bien hidratado (necesitará proporcionar una muestra de orina). Evite alcohol, cafeína, exceso de sodio, azúcar y grandes porciones de carbohidratos por al menos",
        "8 hours": "8 horas",
        "before the exam.": "antes del examen.",
        "Know your medications.": "Conozca sus medicamentos.",
        "For every medication you take - prescription, over-the-counter, and supplements - know the brand or generic name, dosage, and reason. Check the":
            "Para cada medicamento que tome - con receta, de venta libre y suplementos - conozca el nombre comercial o genérico, la dosis y el motivo. Revise la",
        "in advance. Sedating antihistamines like Benadryl require a":
            "con anticipación. Los antihistamínicos sedantes como Benadryl requieren un",
        "60-hour wait time": "tiempo de espera de 60 horas",
        "after the last dose.": "después de la última dosis.",
        "Bring your vision correction.": "Traiga su corrección visual.",
        "Bring all glasses and contact lenses you use for flying. Contacts may be kept in during the vision test. If you think you may need a new prescription, see your optometrist well in advance so your new lenses arrive before your exam.":
            "Traiga todos los anteojos y lentes de contacto que use para volar. Los lentes de contacto pueden permanecer puestos durante la prueba de visión. Si cree que puede necesitar una nueva receta, consulte a su optometrista con suficiente anticipación para que sus nuevos lentes lleguen antes de su examen.",
        "Check your blood pressure.": "Revise su presión arterial.",
        "We recommend pre-testing your blood pressure. Readings above":
            "Recomendamos revisar su presión arterial antes. Lecturas por encima de",
        "155/95": "155/95",
        "may prevent certification; ideally it should be below 150/90. Most blood pressure medications are FAA-approved.":
            "pueden impedir la certificación; idealmente debe estar por debajo de 150/90. La mayoría de los medicamentos para la presión arterial están aprobados por la FAA.",
        "Prepare your medical history.": "Prepare su historial médico.",
        "Know the name, address, and date of": "Conozca el nombre, la dirección y la fecha de",
        "all physician visits in the last 3 years": "todas las visitas médicas de los últimos 3 años",
        ". This includes physicians, PAs, NPs, psychologists, and chiropractors. A record of DUI or substance abuse may affect certification. You can pre-fill this on":
            ". Esto incluye médicos, asistentes médicos, enfermeros practicantes, psicólogos y quiroprácticos. Un historial de DUI o abuso de sustancias puede afectar la certificación. Puede completar esto con anticipación en",
        "CACI documentation (if applicable).": "Documentación CACI (si aplica).",
        "CACI-qualified condition": "condición calificada para CACI",
        "from your treating physician dated within the last":
            "de su médico tratante fechada dentro de los últimos",
        "90 days": "90 días",
        "One of the most common reasons for FAA medical deferrals is medication use. Search our database of over 1,000 medications to quickly check if your prescription is FAA-approved, conditionally allowed, or prohibited.":
            "Una de las razones más comunes para los aplazamientos médicos de la FAA es el uso de medicamentos. Busque en nuestra base de datos de más de 1,000 medicamentos para verificar rápidamente si su receta está aprobada por la FAA, permitida condicionalmente o prohibida.",
        "Always verify": "Siempre verifique",
        "with the official sources linked below.": "con las fuentes oficiales enlazadas abajo.",
        "1,058 medications": "1,058 medicamentos",
        "Type a medication name to check FAA status":
            "Escriba el nombre de un medicamento para verificar el estado FAA",
        "Always verify with official sources or call (301) 208-2273.":
            "Siempre verifique con fuentes oficiales o llame al (301) 208-2273.",
        "stands for": "significa",
        "Conditions AMEs Can Issue": "Condiciones que los AME Pueden Emitir",
        ". These are specific medical conditions that Dr. Kessous can certify":
            ". Estas son condiciones médicas específicas que el Dr. Kessous puede certificar",
        "at the time of your exam": "al momento de su examen",
        "- without deferring the decision to the FAA in Oklahoma City - provided you meet the criteria on the corresponding worksheet.":
            "- sin aplazar la decisión a la FAA en Oklahoma City - siempre que cumpla con los criterios de la hoja de trabajo correspondiente.",
        "To expedite your certification, download the appropriate worksheet and have your treating physician complete a":
            "Para agilizar su certificación, descargue la hoja de trabajo correspondiente y pida a su médico tratante que complete una",
        "dated within 90 days of your exam. Bring both to your appointment.":
            "fechada dentro de los 90 días de su examen. Traiga ambos a su cita.",
        "Summary of condition history": "Resumen del historial de la condición",
        "Clinical exam findings": "Hallazgos del examen clínico",
        "Lab / imaging results (per worksheet)": "Resultados de laboratorio / imágenes (según la hoja de trabajo)",
        "Current medication & dosages": "Medicamentos actuales y dosis",
        "Side effects statement": "Declaración de efectos secundarios",
        "Arthritis": "Artritis",
        "Covers stable osteoarthritis and certain autoimmune arthritis conditions managed with approved medications.":
            "Cubre osteoartritis estable y ciertas condiciones de artritis autoinmune manejadas con medicamentos aprobados.",
        "For well-controlled symptoms with limited rescue inhaler use. Requires pulmonary function testing documentation.":
            "Para síntomas bien controlados con uso limitado de inhalador de rescate. Requiere documentación de pruebas de función pulmonar.",
        "Bladder Cancer": "Cáncer de Vejiga",
        "For applicants at least 5 years post-treatment or on specific maintenance therapy with stable monitoring.":
            "Para solicitantes con al menos 5 años después del tratamiento o en terapia de mantenimiento específica con monitoreo estable.",
        "Breast Cancer": "Cáncer de Mama",
        "For treated or stable breast cancer with documentation of treatment completion and current monitoring status.":
            "Para cáncer de mama tratado o estable con documentación de finalización del tratamiento y estado actual de monitoreo.",
        "Carotid / Vertebral Artery Stenosis": "Estenosis de la Arteria Carótida / Vertebral",
        "Requires documented stability with imaging and neurological evaluation confirming no acute events.":
            "Requiere estabilidad documentada con imágenes y evaluación neurológica que confirme la ausencia de eventos agudos.",
        "For stable platelet counts managed with approved therapy and documented hematology follow-up.":
            "Para recuentos plaquetarios estables manejados con terapia aprobada y seguimiento hematológico documentado.",
        "Requires specific lab values (GFR, creatinine) demonstrating stability. Staging criteria must be met.":
            "Requiere valores específicos de laboratorio (GFR, creatinina) que demuestren estabilidad. Deben cumplirse los criterios de estadificación.",
        "Chronic lymphocytic leukemia or SLL with documented stability and hematology/oncology follow-up.":
            "Leucemia linfocítica crónica o SLL con estabilidad documentada y seguimiento por hematología/oncología.",
        "Colitis (UC, Crohn's, IBS)": "Colitis (CU, Crohn, SII)",
        "Includes ulcerative colitis, Crohn's disease, and IBS. Covers approved medications including GC-C agonists and selective abdominal modulators.":
            "Incluye colitis ulcerosa, enfermedad de Crohn y SII. Cubre medicamentos aprobados incluyendo agonistas GC-C y moduladores abdominales selectivos.",
        "Colon / Colorectal Cancer": "Cáncer de Colon / Colorrectal",
        "For localized, treated, or stable monitored colorectal cancer with documentation of treatment and surveillance.":
            "Para cáncer colorrectal localizado, tratado o estable bajo vigilancia con documentación del tratamiento y seguimiento.",
        "Essential Tremor": "Temblor Esencial",
        "Neurological evaluation required. Must demonstrate tremor does not interfere with safe aircraft operation.":
            "Se requiere evaluación neurológica. Debe demostrar que el temblor no interfiere con la operación segura de la aeronave.",
        "Requires specific visual field testing (Humphrey 24-2 or 30-2) and documentation of stable intraocular pressures.":
            "Requiere pruebas específicas de campo visual (Humphrey 24-2 o 30-2) y documentación de presiones intraoculares estables.",
        "For chronic hepatitis C with documented viral load, liver function testing, and treatment status.":
            "Para hepatitis C crónica con carga viral documentada, pruebas de función hepática y estado del tratamiento.",
        "Allows combinations of up to three approved medications. Must demonstrate blood pressure control within FAA limits.":
            "Permite combinaciones de hasta tres medicamentos aprobados. Debe demostrar control de la presión arterial dentro de los límites de la FAA.",
        "For stable conditions with a current TSH lab result within normal range. One of the most common CACI conditions.":
            "Para condiciones estables con un resultado actual de TSH dentro del rango normal. Una de las condiciones CACI más comunes.",
        "For testosterone replacement therapy with documented stable lab values and treatment plan.":
            "Para terapia de reemplazo de testosterona con valores de laboratorio estables documentados y plan de tratamiento.",
        "Metabolic-associated or non-alcoholic steatohepatitis with documented liver function stability and monitoring.":
            "Esteatohepatitis metabólica o no alcohólica con estabilidad documentada de la función hepática y monitoreo.",
        "Covers specific preventive and abortive treatments. Narcotics, Fiorinal, Fioricet, and Midrin are":
            "Cubre tratamientos preventivos y abortivos específicos. Narcóticos, Fiorinal, Fioricet y Midrin no son",
        "acceptable. Required \"no-fly\" wait times apply.":
            "aceptables. Se aplican los tiempos de espera obligatorios de \"no volar\".",
        "Mitral Valve Repair": "Reparación de la Válvula Mitral",
        "Post-surgical cardiac evaluation required with echocardiogram and documentation of functional recovery.":
            "Se requiere evaluación cardíaca postquirúrgica con ecocardiograma y documentación de la recuperación funcional.",
        "Polycystic Ovarian Syndrome (PCOS)": "Síndrome de Ovario Poliquístico (SOP)",
        "Requires documentation of condition stability, current treatment plan, and relevant lab values.":
            "Requiere documentación de estabilidad de la condición, plan de tratamiento actual y valores de laboratorio relevantes.",
        "Pre-Diabetes": "Prediabetes",
        "For those managed by diet or Metformin with an A1C <= 6.5%. Requires current lab documentation of glycemic control.":
            "Para quienes se controlan con dieta o Metformina con un A1C <= 6.5%. Requiere documentación actual de laboratorio del control glucémico.",
        "Primary Hemochromatosis": "Hemocromatosis Primaria",
        "Iron overload condition requiring documented ferritin levels, treatment history, and organ function monitoring.":
            "Condición de sobrecarga de hierro que requiere niveles documentados de ferritina, historial de tratamiento y monitoreo de la función orgánica.",
        "Prostate Cancer": "Cáncer de Próstata",
        "For localized, treated, or stable monitored prostate cancer. Requires PSA levels and treatment documentation.":
            "Para cáncer de próstata localizado, tratado o estable bajo vigilancia. Requiere niveles de PSA y documentación del tratamiento.",
        "Psoriasis": "Psoriasis",
        "Stable psoriasis managed with approved topical or systemic treatments. Dermatology documentation required.":
            "Psoriasis estable manejada con tratamientos tópicos o sistémicos aprobados. Se requiere documentación dermatológica.",
        "Renal Cancer": "Cáncer Renal",
        "Treated or stable renal cancer with imaging surveillance and oncology documentation of remission status.":
            "Cáncer renal tratado o estable con vigilancia por imágenes y documentación oncológica del estado de remisión.",
        "Retained Kidney Stone(s)": "Cálculo(s) Renal(es) Retenido(s)",
        "Requires imaging documentation showing stone size and location, plus clinical assessment of symptom stability.":
            "Requiere documentación por imágenes que muestre el tamaño y la ubicación del cálculo, además de una evaluación clínica de la estabilidad de los síntomas.",
        "Testicular Cancer": "Cáncer Testicular",
        "For treated testicular cancer with documentation of treatment completion and surveillance monitoring.":
            "Para cáncer testicular tratado con documentación de finalización del tratamiento y monitoreo de vigilancia.",
        "Weight Loss Management (GLP-1)": "Manejo de Pérdida de Peso (GLP-1)",
        "Covers the use of approved GLP-1 medications such as semaglutide (Ozempic, Wegovy) and tirzepatide (Mounjaro) for weight management.":
            "Cubre el uso de medicamentos GLP-1 aprobados como semaglutida (Ozempic, Wegovy) y tirzepatida (Mounjaro) para el manejo del peso.",
        "The most comprehensive aviation medication resource. Search by trade name, generic name, category, or purpose.":
            "El recurso de medicamentos de aviación más completo. Busque por nombre comercial, nombre genérico, categoría o propósito.",
        "Official AME Guide drug-by-drug reference covering approved, conditional, and prohibited medications.":
            "Referencia oficial de la Guía AME medicamento por medicamento que cubre medicamentos aprobados, condicionales y prohibidos.",
        "Medications that automatically disqualify you from certification.":
            "Medicamentos que automáticamente lo descalifican de la certificación.",
        "Over-the-counter meds that are generally allowed, with required wait times.":
            "Medicamentos de venta libre que generalmente están permitidos, con tiempos de espera requeridos.",
        "Quick-reference PDF on common medications, wait times, and AME discussion points.":
            "PDF de referencia rápida sobre medicamentos comunes, tiempos de espera y puntos de discusión con el AME.",
        "FAA article on the relationship between medications, flying, and your medical certificate.":
            "Artículo de la FAA sobre la relación entre los medicamentos, volar y su certificado médico.",

        // Immigration residual coverage
        "The Exam Process": "El Proceso del Examen",
        "Exam Process": "Proceso del Examen",
        "Prior TB / STI Records": "Registros Previos de TB / ITS",
        "First Visit - Lab Work & Records Review": "Primera Visita - Análisis y Revisión de Registros",
        "- blood test (IGRA) for most patients; skin test (TST) for children under 2":
            "- análisis de sangre (IGRA) para la mayoría de los pacientes; prueba cutánea (TST) para niños menores de 2 años",
        "- required for ages 15 and older": "- requerido para edades de 15 años en adelante",
        "- we identify which vaccines are needed": "- identificamos qué vacunas se necesitan",
        "- comprehensive health evaluation": "- evaluación integral de salud",
        "Second Visit - Physical Exam & I-693": "Segunda Visita - Examen Físico e I-693",
        "- all test results reviewed and documented": "- todos los resultados de las pruebas revisados y documentados",
        "Varicella": "Varicela",
        "Tdap": "Tdap",
        "Influenza": "Influenza",
        "(Flu)": "(Gripe)",
        "Pneumococcal": "Neumocócica",
        "Polio": "Polio",
        "(IPV)": "(IPV)",
        "Hib": "Hib",
        "2 doses required; or lab-confirmed immunity":
            "2 dosis requeridas; o inmunidad confirmada por laboratorio",
        "3-dose series; or lab-confirmed immunity":
            "Serie de 3 dosis; o inmunidad confirmada por laboratorio",
        "2 doses; or lab-confirmed immunity; or documented history of disease":
            "2 dosis; o inmunidad confirmada por laboratorio; o historial documentado de la enfermedad",
        "1 dose Tdap; plus Td booster every 10 years":
            "1 dosis de Tdap; más refuerzo de Td cada 10 años",
        "4-dose series": "Serie de 4 dosis",
        "2 or 3 dose series depending on brand":
            "Serie de 2 o 3 dosis según la marca",
        "2-dose series": "Serie de 2 dosis",
        "1-2 Week Processing": "Procesamiento de 1-2 Semanas",
        "1-2 weeks": "1-2 semanas",
        "2 years": "2 años",
        "Official USCIS page for Form I-693 - Report of Medical Examination and Vaccination Record.":
            "Página oficial de USCIS para el Formulario I-693 - Informe de Examen Médico y Registro de Vacunación.",
        "Application to Register Permanent Residence or Adjust Status - where your sealed I-693 is submitted.":
            "Solicitud para Registrar Residencia Permanente o Ajuste de Estatus - donde se presenta su I-693 sellado.",

        // Corporate health residual coverage
        "is a board-certified Occupational Medicine physician partnering with businesses across Maryland to deliver comprehensive occupational health and workplace wellness programs. Our services follow":
            "es un médico certificado en Medicina Ocupacional que se asocia con empresas en todo Maryland para brindar programas integrales de salud ocupacional y bienestar en el lugar de trabajo. Nuestros servicios siguen",
        "Testing": "Pruebas",
        "Drug Panels": "Paneles de Drogas",
        "Workers' Comp": "Compensación Laboral",
        "Wellness": "Bienestar",
        "Vaccines": "Vacunas",
        "Maryland WCC guidelines.": "las pautas de la WCC de Maryland.",
        "On-Site Wellness": "Bienestar en el Lugar",
        "seasonal flu shots, health screenings, and quick check-ups - keeping your team healthy with minimal time away from work.":
            "vacunas estacionales contra la gripe, evaluaciones de salud y chequeos rápidos - manteniendo a su equipo saludable con el mínimo tiempo fuera del trabajo.",
        "Return-to-Work": "Regreso al Trabajo",
        "OSHA-compliant surveillance protocols and CDC-recommended vaccinations":
            "Protocolos de vigilancia que cumplen con OSHA y vacunas recomendadas por los CDC",
        "Why Us": "Por Qué Nosotros",
        "A pre-employment physical is more than a formality - it's the foundation of a safe workplace. Dr. Kessous designs each examination protocol around the physical and cognitive demands of the specific role, ensuring workers are genuinely ready for duty from their very first day.":
            "Un examen físico previo al empleo es más que una formalidad - es la base de un lugar de trabajo seguro. El Dr. Kessous diseña cada protocolo de examen en función de las demandas físicas y cognitivas del puesto específico, asegurando que los trabajadores estén verdaderamente listos para el servicio desde su primer día.",
        "Medical history & medication review": "Revisión del historial médico y medicamentos",
        "Vital signs (BP, HR, height, weight, BMI)": "Signos vitales (PA, FC, altura, peso, IMC)",
        "Distance & near vision (OD, OS, OU)": "Visión a distancia y cercana (OD, OS, OU)",
        "Color vision (Ishihara plates)": "Visión de colores (placas de Ishihara)",
        "Depth perception assessment": "Evaluación de la percepción de profundidad",
        "Audiometric hearing test": "Prueba auditiva audiométrica",
        "Urinalysis (glucose, protein, blood)": "Análisis de orina (glucosa, proteína, sangre)",
        "Musculoskeletal & shoulder ROM": "Rango de movimiento musculoesquelético y de hombro",
        "Repetitive motion & grip tests": "Pruebas de movimiento repetitivo y agarre",
        "Role-specific add-ons": "Componentes adicionales específicos del puesto",
        "Workers required to wear tight-fitting respirators (N95, half-face, full-face)":
            "Trabajadores que deben usar respiradores ajustados (N95, media cara, cara completa)",
        "Warehouse, construction, healthcare, field service, and any physically demanding role":
            "Almacén, construcción, salud, servicio de campo y cualquier puesto físicamente exigente",
        "Job-specific functional capacity": "Capacidad funcional específica del puesto",
        "Employees who will be exposed to occupational noise at or above 85 dBA TWA":
            "Empleados que estarán expuestos a ruido ocupacional de 85 dBA TWA o más",
        "Healthcare workers, laboratory staff, correctional facilities, childcare workers":
            "Trabajadores de la salud, personal de laboratorio, centros correccionales y trabajadores de cuidado infantil",
        "Drivers, forklift operators, security personnel, first responders":
            "Conductores, operadores de montacargas, personal de seguridad y socorristas",
        "Role-specific requirement": "Requisito específico del puesto",
        "Manufacturing, assembly, data entry, and other repetitive hand/wrist roles":
            "Manufactura, ensamblaje, entrada de datos y otros puestos repetitivos de mano/muñeca",
        "NIOSH ergonomic guidance": "Guía ergonómica de NIOSH",
        "Most employers; panel selected based on industry, role, and employer drug-free workplace policy":
            "La mayoría de los empleadores; el panel se selecciona según la industria, el puesto y la política del empleador de lugar de trabajo libre de drogas",
        "Employer drug-free workplace policy": "Política del empleador de lugar de trabajo libre de drogas",
        "Employees with potential respiratory hazard exposure; respirator users with medical concerns":
            "Empleados con posible exposición a riesgos respiratorios; usuarios de respiradores con preocupaciones médicas",
        "We work with your HR or EHS team to define the appropriate testing protocol for each job category. All results are documented in a structured report formatted for your records management system.":
            "Trabajamos con su equipo de RR.HH. o EHS para definir el protocolo de pruebas apropiado para cada categoría de trabajo. Todos los resultados se documentan en un informe estructurado con formato para su sistema de gestión de registros.",
        "OSHA requires medical surveillance for employees exposed to specific hazards above action levels or permissible exposure limits (PELs). These programs are distinct from pre-employment physicals - they are ongoing, triggered by exposure, and mandated by specific OSHA standards. Dr. Kessous designs and administers surveillance programs that keep your business in full compliance.":
            "OSHA requiere vigilancia médica para empleados expuestos a peligros específicos por encima de los niveles de acción o límites permisibles de exposición (PEL). Estos programas son distintos de los exámenes físicos previos al empleo - son continuos, se activan por la exposición y están exigidos por normas específicas de OSHA. El Dr. Kessous diseña y administra programas de vigilancia que mantienen a su empresa en pleno cumplimiento.",
        "Medical screening": "Detección médica",
        "is a one-time clinical event focused on individual diagnosis - like a pre-employment exam.":
            "es un evento clínico único enfocado en el diagnóstico individual - como un examen previo al empleo.",
        "Medical surveillance": "Vigilancia médica",
        "is an ongoing program designed to detect population-level trends in health outcomes related to workplace exposures, identify early signs of occupational disease, and eliminate underlying hazards. Both are important; only surveillance is mandated by OSHA exposure standards.":
            "es un programa continuo diseñado para detectar tendencias a nivel poblacional en resultados de salud relacionados con exposiciones laborales, identificar signos tempranos de enfermedad ocupacional y eliminar peligros subyacentes. Ambos son importantes; solo la vigilancia está exigida por los estándares de exposición de OSHA.",
        "Mandatory medical evaluation (questionnaire) before respirator use, with physician follow-up if indicated. Includes baseline and annual fit testing for tight-fitting facepieces. Covers N95, half-face, full-face respirators, and supplied-air respirators (SCBA).":
            "Evaluación médica obligatoria (cuestionario) antes del uso de respirador, con seguimiento médico si está indicado. Incluye prueba de ajuste inicial y anual para mascarillas ajustadas. Cubre respiradores N95, de media cara, de cara completa y respiradores con suministro de aire (SCBA).",
        "Baseline audiogram at hire (within 6 months of first exposure), annual audiograms for employees exposed to ≥85 dBA 8-hr TWA, and Standard Threshold Shift (STS) evaluation and notification. Covers manufacturing, construction, and industrial environments.":
            "Audiograma inicial al contratar (dentro de los 6 meses de la primera exposición), audiogramas anuales para empleados expuestos a ≥85 dBA TWA de 8 horas, y evaluación y notificación de Cambio de Umbral Estándar (STS). Cubre entornos de manufactura, construcción e industriales.",
        "Post-exposure evaluation and follow-up after potential exposure incidents. Hepatitis B vaccination and titer verification for employees with occupational exposure risk. Confidential medical records maintained per OSHA requirements. Required for healthcare, laboratory, and first-responder workforces.":
            "Evaluación y seguimiento posterior a la exposición después de incidentes de exposición potencial. Vacunación contra Hepatitis B y verificación de títulos para empleados con riesgo de exposición ocupacional. Registros médicos confidenciales mantenidos según los requisitos de OSHA. Requerido para fuerzas laborales de salud, laboratorio y socorristas.",
        "EKG required at age 35, then annually after 40":
            "EKG requerido a los 35 años, luego anualmente después de los 40",
        "Stricter vision and cardiovascular standards":
            "Estándares más estrictos de visión y cardiovasculares",
        "mandatory": "obligatorio",
        "- distance, near, and color vision":
            "- visión a distancia, cercana y de colores",
        "- conversational voice or audiometric":
            "- voz conversacional o audiométrica",
        "- screening for sugar and protein":
            "- detección de azúcar y proteína",
        "- heart, lungs, abdomen, neuro":
            "- corazón, pulmones, abdomen, neurológico",
        "- required for Class 1 at age 35 and annually after 40":
            "- requerido para Clase 1 a los 35 años y anualmente después de los 40",
        "- the AME reviews your 8500-8 with you":
            "- el AME revisa su 8500-8 con usted",
        "EKG reminder (Class 1).": "Recordatorio de EKG (Clase 1).",
        "If you're age 40+, you need an EKG annually. This is the most common reason pilots accidentally \"drop down\" a class.":
            "Si tiene 40 años o más, necesita un EKG anualmente. Esta es la razón más común por la que los pilotos accidentalmente \"bajan\" de clase.",
        "Aggregate repeat visits.": "Agrupe visitas repetidas.",
        "If you see the same doctor multiple times for the same stable condition, you can list it as one entry using the most recent visit date.":
            "Si ve al mismo médico varias veces por la misma condición estable, puede listarlo como una sola entrada usando la fecha de visita más reciente.",
        "Check the CACI list.": "Revise la lista CACI.",
        "If you've been diagnosed with a new condition since your last exam, check our":
            "Si le han diagnosticado una nueva condición desde su último examen, revise nuestra",
        "CACI worksheets section": "sección de hojas de trabajo CACI",
        ". Many stable conditions can now be certified in-office without deferral to Oklahoma City.":
            ". Muchas condiciones estables ahora pueden certificarse en la oficina sin aplazamiento a Oklahoma City.",
        "Bring a DCPN.": "Traiga una DCPN.",
        "For CACI conditions, bring a":
            "Para condiciones CACI, traiga una",
        "Current Detailed Clinical Progress Note":
            "Nota de Progreso Clínico Detallada Actual",
        "from your treating physician dated within 90 days of your exam. A standard \"After Visit Summary\" is not sufficient - it must include history, exam findings, lab results, assessment, and a side effects statement.":
            "de su médico tratante fechada dentro de los 90 días de su examen. Un \"After Visit Summary\" estándar no es suficiente - debe incluir historial, hallazgos del examen, resultados de laboratorio, evaluación y una declaración de efectos secundarios.",
        "Consider BasicMed.": "Considere BasicMed.",
        "If you no longer need commercial privileges,":
            "Si ya no necesita privilegios comerciales,",
        "lets you fly with any state-licensed physician's exam plus an online course - no AME visit needed. You must have held a valid medical certificate after July 15, 2006.":
            "le permite volar con el examen de cualquier médico con licencia estatal más un curso en línea - no se necesita visita con un AME. Debe haber tenido un certificado médico válido después del 15 de julio de 2006.",
        "Special Issuance support.": "Apoyo para Emisión Especial.",
        "If you don't meet CACI criteria, Dr. Kessous can help you through the Special Issuance (SI) process - gathering records and serving as your advocate with the FAA.":
            "Si no cumple los criterios CACI, el Dr. Kessous puede ayudarle con el proceso de Emisión Especial (SI) - reuniendo registros y sirviendo como su defensor ante la FAA.",
        "Always verify with official sources or call":
            "Siempre verifique con fuentes oficiales o llame al",
        "Even common over-the-counter medications may require a \"no-fly\" waiting period:":
            "Incluso medicamentos comunes de venta libre pueden requerir un período de espera de \"no volar\":",
        "Diphenhydramine (Benadryl)": "Difenhidramina (Benadryl)",
        "60-hour wait": "Espera de 60 horas",
        "Doxylamine (Unisom, NyQuil)": "Doxilamina (Unisom, NyQuil)",
        "Melatonin": "Melatonina",
        "24-hour wait": "Espera de 24 horas",
        "Pseudoephedrine (Sudafed)": "Pseudoefedrina (Sudafed)",
        "Ground trial": "Prueba en tierra",
        "Ibuprofen, Acetaminophen": "Ibuprofeno, Acetaminofén",
        "Loratadine, Cetirizine, Fexofenadine":
            "Loratadina, Cetirizina, Fexofenadina",
        "No wait": "Sin espera",
        "Full list available at": "Lista completa disponible en",
        ". Worksheets are official FAA documents (PDF).":
            ". Las hojas de trabajo son documentos oficiales de la FAA (PDF).",
        "automatically disqualify": "automáticamente descalifican",
        ". These are specific medical conditions that your Aviation Medical Examiner can certify at the time of your exam without deferring the decision to the FAA in Oklahoma City.":
            ". Estas son condiciones médicas específicas que su Examinador Médico de Aviación puede certificar al momento de su examen sin aplazar la decisión a la FAA en Oklahoma City.",
        "You must meet the criteria on the corresponding worksheet and bring a Current Detailed Clinical Progress Note (DCPN) from your treating physician dated within 90 days. See the":
            "Debe cumplir los criterios de la hoja de trabajo correspondiente y traer una Nota de Progreso Clínico Detallada Actual (DCPN) de su médico tratante fechada dentro de los 90 días. Vea la",
        "full CACI list above": "lista completa de CACI arriba",
        "Your certificate doesn't expire immediately - it":
            "Su certificado no vence inmediatamente -",
        "\"steps down\"": "\"desciende\"",
        "to the next lower class. A Class 1 becomes a Class 2, then eventually a Class 3. You can continue flying under the lower privileges until the Class 3 validity period expires completely.":
            "a la siguiente clase inferior. Una Clase 1 se convierte en Clase 2 y luego eventualmente en Clase 3. Puede continuar volando bajo los privilegios inferiores hasta que el período de validez de la Clase 3 expire por completo.",
        "You do": "Usted no",
        "need a new certificate for this to happen. See the":
            "necesita un nuevo certificado para que esto suceda. Vea la",
        "step-down rule": "regla de reducción",
        "for a full example.": "para ver un ejemplo completo.",
        "Yes, this is mandatory.": "Sí, esto es obligatorio.",
        "Complete your application (Form 8500-8) at":
            "Complete su solicitud (Formulario 8500-8) en",
        "before your appointment. Bring your Confirmation Number and a printed copy. The application is valid for 60 days.":
            "antes de su cita. Traiga su Número de Confirmación y una copia impresa. La solicitud es válida por 60 días.",
        "Check these resources in order:": "Revise estos recursos en este orden:",
        "- if your medication is on this list, you cannot be certified.":
            "- si su medicamento está en esta lista, no puede ser certificado.",
        "- search by drug name, category, or purpose.":
            "- busque por nombre del medicamento, categoría o propósito.",
        "- detailed drug-by-drug reference.":
            "- referencia detallada medicamento por medicamento.",
        "If you're unsure, call our office at":
            "Si no está seguro, llame a nuestra oficina al",
        "before your exam.": "antes de su examen.",
        "is an alternative to traditional FAA medical certification for non-commercial pilots. If you held a valid medical certificate after July 15, 2006, you can fly under BasicMed by:":
            "es una alternativa a la certificación médica FAA tradicional para pilotos no comerciales. Si tuvo un certificado médico válido después del 15 de julio de 2006, puede volar bajo BasicMed mediante:",
        "Required during flu season (October-March)":
            "Requerido durante la temporada de gripe (octubre-marzo)",
        "Ages 2-4 and 65+": "Edades 2-4 y 65+",
        "Ages 2 months - 17 years": "De 2 meses a 17 años",
        "Infants 6 weeks - 8 months": "Bebés de 6 semanas a 8 meses",
        "Ages 2 months - 4 years": "De 2 meses a 4 años",
        "Ages 12 months - 23 months": "De 12 a 23 meses",
        "Search civil surgeons →": "Buscar cirujanos civiles →",
        "View CDC guide →": "Ver guía del CDC →",
        "View form →": "Ver formulario →",
        "Read USCIS guide →": "Leer guía de USCIS →",
        "View CDC resources →": "Ver recursos del CDC →",
        "Respirator Fit Test (QLFT/QNFT)": "Prueba de Ajuste de Respirador (QLFT/QNFT)",
        "30 / 50 lb Lift Test": "Prueba de Levantamiento de 30 / 50 lb",
        "Audiometric (Baseline) Test": "Prueba Audiométrica (Inicial)",
        "TB Screening (TST / IGRA)": "Detección de TB (TST / IGRA)",
        "Visual Field Assessment": "Evaluación del Campo Visual",
        "Repetitive Motion (Tinel / Phalen / Finkelstein)":
            "Movimiento Repetitivo (Tinel / Phalen / Finkelstein)",
        "Drug Screen (5, 10, or 16 panel)":
            "Prueba de Drogas (panel de 5, 10 o 16)",
        "Spirometry (Pulmonary Function Test)":
            "Espirometría (Prueba de Función Pulmonar)",
        "To build the right protocol, share the employee's":
            "Para construir el protocolo correcto, comparta la",
        "job description": "descripción del puesto",
        ", any known": ", cualquier",
        "physical demands analysis (PDA)": "análisis conocido de demandas físicas (PDA)",
        ", and your industry's": ", y los",
        "applicable OSHA standards": "estándares OSHA aplicables de su industria",
        ". This allows Dr. Kessous to ensure the exam is both medically appropriate and legally defensible.":
            ". Esto permite al Dr. Kessous asegurar que el examen sea médicamente apropiado y legalmente defendible.",
        "Medical surveillance for employees exposed to hazardous chemicals including lead, asbestos, benzene, formaldehyde, ethylene oxide, and others with specific OSHA standards. Includes exposure history review, targeted physical exam, and required biological monitoring labs.":
            "Vigilancia médica para empleados expuestos a químicos peligrosos incluyendo plomo, asbesto, benceno, formaldehído, óxido de etileno y otros con estándares específicos de OSHA. Incluye revisión del historial de exposición, examen físico dirigido y laboratorios de monitoreo biológico requeridos.",
        "Periodic evaluation of employees in high-repetition, high-force, or awkward-posture roles. Tinel, Phalen, and Finkelstein tests for cumulative trauma disorder detection. Early-intervention programs reduce lost work days and workers' compensation costs.":
            "Evaluación periódica de empleados en puestos de alta repetición, alta fuerza o posturas incómodas. Pruebas de Tinel, Phalen y Finkelstein para detección de trastornos por trauma acumulativo. Los programas de intervención temprana reducen días de trabajo perdidos y costos de compensación laboral.",
        "Baseline TB testing at hire with periodic testing based on risk classification. IGRA (QuantiFERON-Gold) or TST (tuberculin skin test) per CDC guidelines. Required for healthcare workers, laboratory personnel, correctional staff, and shelter/social service workers.":
            "Prueba inicial de TB al contratar con pruebas periódicas según la clasificación de riesgo. IGRA (QuantiFERON-Gold) o TST (prueba cutánea de tuberculina) según las pautas de los CDC. Requerido para trabajadores de la salud, personal de laboratorio, personal correccional y trabajadores de refugios/servicios sociales.",
        "(Access to Employee Exposure and Medical Records). Records must be preserved for the duration of employment plus 30 years for most hazardous substance exposure records. We provide employers with appropriately formatted documentation while maintaining individual employee privacy.":
            "(Acceso a los Registros de Exposición y Médicos del Empleado). Los registros deben conservarse durante la duración del empleo más 30 años para la mayoría de los registros de exposición a sustancias peligrosas. Proporcionamos a los empleadores documentación con el formato adecuado mientras mantenemos la privacidad individual del empleado.",
        "All diagnostic tests are performed on-site by trained staff under physician supervision. Results are delivered in structured reports formatted for HR, safety officers, and insurers.":
            "Todas las pruebas diagnósticas se realizan en el lugar por personal capacitado bajo supervisión médica. Los resultados se entregan en informes estructurados con formato para RR.HH., oficiales de seguridad y aseguradoras.",
        "Audiometric Exam": "Examen Audiométrico",
        "500-8,000 Hz bilateral": "500-8,000 Hz bilateral",
        "Hearing thresholds across speech and high frequencies; detects noise-induced hearing loss and STS":
            "Umbrales auditivos a través del habla y frecuencias altas; detecta pérdida auditiva inducida por ruido y STS",
        "Pre-employment baseline; annual OSHA surveillance; post-exposure evaluation":
            "Línea base previa al empleo; vigilancia anual OSHA; evaluación post-exposición",
        "Respirator Fit Test": "Prueba de Ajuste de Respirador",
        "QLFT & QNFT": "QLFT y QNFT",
        "Adequacy of respirator seal; verifies facepiece selection and donning technique":
            "Adecuación del sello del respirador; verifica la selección de la mascarilla y la técnica de colocación",
        "Required before initial respirator use; annually thereafter; after significant weight change or facial surgery":
            "Requerido antes del uso inicial del respirador; anualmente después; después de un cambio significativo de peso o cirugía facial",
        "Vision Testing": "Pruebas de Visión",
        "Distance, Near, Color, Depth, Field": "Distancia, Cerca, Color, Profundidad, Campo",
        "Distance acuity (20/20 standard), near acuity, color discrimination (Ishihara), depth perception (Sheppard/Fry), peripheral visual field":
            "Agudeza visual a distancia (estándar 20/20), agudeza cercana, discriminación de colores (Ishihara), percepción de profundidad (Sheppard/Fry), campo visual periférico",
        "Pre-employment; driver physicals; safety-sensitive roles; forklift and equipment operators":
            "Previo al empleo; exámenes físicos de conductores; puestos sensibles a la seguridad; operadores de montacargas y equipos",
        "Functional capacity for sustained lifting at specified weights; posture and technique observed":
            "Capacidad funcional para levantamiento sostenido en pesos especificados; postura y técnica observadas",
        "Pre-employment for physically demanding roles; return-to-work clearance":
            "Previo al empleo para puestos físicamente exigentes; autorización de regreso al trabajo",
        "Repetitive Motion Tests": "Pruebas de Movimiento Repetitivo",
        "Tinel, Phalen, Finkelstein": "Tinel, Phalen, Finkelstein",
        "Carpal tunnel syndrome indicators (Tinel, Phalen) and De Quervain tenosynovitis (Finkelstein)":
            "Indicadores de síndrome del túnel carpiano (Tinel, Phalen) y tenosinovitis de De Quervain (Finkelstein)",
        "Pre-employment for repetitive-motion roles; ergonomic surveillance; return-to-work":
            "Previo al empleo para puestos de movimiento repetitivo; vigilancia ergonómica; regreso al trabajo",
        "Shoulder Range of Motion": "Rango de Movimiento del Hombro",
        "Active ROM in all planes; identifies restrictions relevant to overhead or reaching tasks":
            "ROM activo en todos los planos; identifica restricciones relevantes para tareas por encima de la cabeza o de alcance",
        "Pre-employment; return-to-work after upper extremity injury":
            "Previo al empleo; regreso al trabajo después de lesión de extremidad superior",
        "Reach Test": "Prueba de Alcance",
        "Functional reaching ability (Trial 1 & 2); relevant for shelf-stocking, maintenance, and overhead work":
            "Capacidad funcional de alcance (Prueba 1 y 2); relevante para surtido de estantes, mantenimiento y trabajo por encima de la cabeza",
        "Pre-employment; return-to-work evaluations":
            "Previo al empleo; evaluaciones de regreso al trabajo",
        "Urinalysis": "Análisis de Orina",
        "Glucose, Protein, Blood": "Glucosa, Proteína, Sangre",
        "Renal function indicators, metabolic screening; chain-of-custody specimen for drug testing":
            "Indicadores de función renal, evaluación metabólica; muestra con cadena de custodia para pruebas de drogas",
        "Standard component of pre-employment and OSHA physicals":
            "Componente estándar de exámenes físicos previos al empleo y de OSHA",
        "TB Testing (TST / IGRA)": "Pruebas de TB (TST / IGRA)",
        "Latent or active tuberculosis infection; IGRA (QuantiFERON-Gold) preferred for BCG-vaccinated individuals":
            "Infección tuberculosa latente o activa; IGRA (QuantiFERON-Gold) preferido para personas vacunadas con BCG",
        "Healthcare workers; laboratory staff; correctional and shelter employees; annual surveillance":
            "Trabajadores de la salud; personal de laboratorio; empleados correccionales y de refugios; vigilancia anual",
        "Visual Field Testing": "Pruebas de Campo Visual",
        "Peripheral and central visual field integrity; relevant for driving and safety-sensitive roles":
            "Integridad del campo visual periférico y central; relevante para conducción y puestos sensibles a la seguridad",
        "Commercial driver physicals; security and law enforcement; forklift operators":
            "Exámenes físicos para conductores comerciales; seguridad y fuerzas del orden; operadores de montacargas",
        "Every exam generates a standardized report that includes vital signs, individual test results with reference ranges, pass/fail or normal/abnormal designations, work restriction recommendations if applicable, and physician signature. Reports are formatted for direct intake into HR information systems or insurer case management portals.":
            "Cada examen genera un informe estandarizado que incluye signos vitales, resultados individuales de pruebas con rangos de referencia, designaciones de aprobado/reprobado o normal/anormal, recomendaciones de restricciones laborales si aplica, y firma del médico. Los informes están formateados para ingreso directo en sistemas de información de RR.HH. o portales de gestión de casos de aseguradoras.",
        "We offer employer-grade drug testing with full chain-of-custody procedures for general employment screening. Panels are available for pre-employment, random, post-accident, and reasonable suspicion testing programs.":
            "Ofrecemos pruebas de drogas de nivel empresarial con procedimientos completos de cadena de custodia para detección laboral general. Los paneles están disponibles para programas de pruebas previas al empleo, aleatorias, post-accidente y por sospecha razonable.",
        "Standard workplace panel covering the most commonly tested substances in employment drug screening programs.":
            "Panel laboral estándar que cubre las sustancias más comúnmente analizadas en programas de detección de drogas en el empleo.",
        "Expanded panel covering additional prescription and illicit substances commonly tested in safety-sensitive roles.":
            "Panel ampliado que cubre sustancias adicionales con receta e ilícitas comúnmente analizadas en puestos sensibles a la seguridad.",
        "Our most comprehensive panel, covering modern synthetic opioids and prescription medications increasingly encountered in workplace testing programs.":
            "Nuestro panel más completo, que cubre opioides sintéticos modernos y medicamentos con receta que se encuentran cada vez más en programas de pruebas laborales.",
        "Conducted before a job offer is finalized or before start date. A negative result is a condition of hire.":
            "Realizada antes de que se finalice una oferta de trabajo o antes de la fecha de inicio. Un resultado negativo es una condición de contratación.",
        "Unannounced testing selected by computer-generated random process for ongoing workforce deterrence programs.":
            "Pruebas no anunciadas seleccionadas por un proceso aleatorio generado por computadora para programas continuos de disuasión de la fuerza laboral.",
        "After a workplace injury or near-miss incident, as required by employer policy or safety program guidelines.":
            "Después de una lesión laboral o incidente de casi accidente, según lo requiera la política del empleador o las pautas del programa de seguridad.",
        "When a trained supervisor observes specific signs and symptoms of impairment consistent with substance use.":
            "Cuando un supervisor capacitado observa signos y síntomas específicos de deterioro consistentes con el uso de sustancias.",
        "Workplace injuries disrupt operations and affect both the employee and the organization. Our goal is a safe, medically guided return to full function - with documentation structured to support smooth processing by HR, insurers, and the Maryland Workers' Compensation Commission (WCC).":
            "Las lesiones laborales interrumpen las operaciones y afectan tanto al empleado como a la organización. Nuestro objetivo es un regreso seguro y médicamente guiado a la función completa - con documentación estructurada para apoyar un procesamiento fluido por parte de RR.HH., aseguradoras y la Comisión de Compensación Laboral de Maryland (WCC).",
        "Injury care": "Atención de lesiones",
        "Comprehensive assessment of the injury mechanism, anatomy affected, and functional limitations. Imaging orders placed when clinically indicated.":
            "Evaluación integral del mecanismo de la lesión, la anatomía afectada y las limitaciones funcionales. Se solicitan estudios de imagen cuando está clínicamente indicado.",
        "Clear ICD-10 coded diagnosis and a documented treatment plan including medications, physical therapy referrals, and specialist coordination if needed.":
            "Diagnóstico claro codificado con ICD-10 y un plan de tratamiento documentado que incluye medicamentos, referencias a terapia física y coordinación con especialistas si es necesario.",
        "Written work status notes specifying full duty, modified duty, or temporary total disability - updated at each visit and formatted for insurer case management.":
            "Notas escritas del estado laboral que especifican servicio completo, servicio modificado o incapacidad total temporal - actualizadas en cada visita y formateadas para la gestión de casos de aseguradoras.",
        "Regular progress evaluations to assess recovery, adjust treatment, and identify obstacles to return. Direct communication with HR and case managers.":
            "Evaluaciones regulares de progreso para evaluar la recuperación, ajustar el tratamiento e identificar obstáculos para el regreso. Comunicación directa con RR.HH. y gestores de casos.",
        "All documentation formatted for Maryland Workers' Compensation Commission requirements, reducing administrative burden on your team.":
            "Toda la documentación está formateada según los requisitos de la Comisión de Compensación Laboral de Maryland, reduciendo la carga administrativa sobre su equipo.",
        "Return to work": "Regreso al trabajo",
        "Review of treatment records, imaging, specialist notes, and any functional capacity evaluation (FCE) results to establish current medical status.":
            "Revisión de registros de tratamiento, estudios de imagen, notas de especialistas y cualquier resultado de evaluación de capacidad funcional (FCE) para establecer el estado médico actual.",
        "Targeted physical examination including strength, ROM, endurance, and job-task simulation (lifting, reaching, gripping) matched to the employee's job description.":
            "Examen físico dirigido que incluye fuerza, ROM, resistencia y simulación de tareas laborales (levantar, alcanzar, agarrar) ajustado a la descripción del puesto del empleado.",
        "Clear, specific restrictions (e.g., \"no lifting >20 lbs,\" \"no overhead work,\" \"limited standing to 4 hours/day\") aligned with the employee's job demands.":
            "Restricciones claras y específicas (por ejemplo, \"no levantar >20 lb\", \"no trabajo por encima de la cabeza\", \"estar de pie limitado a 4 horas/día\") alineadas con las demandas laborales del empleado.",
        "Written clearance documenting the physician's determination that the employee can safely return, with or without restrictions. Appropriate for employer, insurer, and legal purposes.":
            "Autorización escrita que documenta la determinación del médico de que el empleado puede regresar de forma segura, con o sin restricciones. Apropiada para propósitos del empleador, la aseguradora y legales.",
        "Guidance to HR on structuring modified-duty assignments that comply with restrictions while keeping the employee productively engaged during recovery.":
            "Orientación para RR.HH. sobre cómo estructurar asignaciones de servicio modificado que cumplan con las restricciones mientras mantienen al empleado productivamente involucrado durante la recuperación.",
        "Back & neck injuries": "Lesiones de espalda y cuello",
        "Lacerations & wounds": "Laceraciones y heridas",
        "Fractures (non-surgical)": "Fracturas (no quirúrgicas)",
        "Repetitive motion injuries": "Lesiones por movimiento repetitivo",
        "Chemical exposures": "Exposiciones químicas",
        "Eye injuries": "Lesiones oculares",
        "Noise-induced hearing loss": "Pérdida auditiva inducida por ruido",
        "Healthy employees are more productive, miss fewer days, and cost less to insure. Our corporate wellness days bring preventive healthcare directly to your workplace, minimizing disruption and maximizing participation.":
            "Los empleados saludables son más productivos, faltan menos días y cuestan menos de asegurar. Nuestros días de bienestar corporativo llevan la atención preventiva directamente a su lugar de trabajo, minimizando la interrupción y maximizando la participación.",
        "On-site administration of seasonal influenza vaccines for your entire workforce. We handle scheduling, consenting, and documentation. Available September through March. Accommodates large teams efficiently.":
            "Administración en el lugar de vacunas estacionales contra la influenza para toda su fuerza laboral. Nos encargamos de la programación, consentimientos y documentación. Disponible de septiembre a marzo. Se adapta eficientemente a equipos grandes.",
        "Rapid point-of-care measurement of key health indicators: blood pressure, BMI, cholesterol (total, HDL, LDL), fasting glucose, and waist circumference. Results are provided immediately with aggregate population reports available.":
            "Medición rápida en el punto de atención de indicadores clave de salud: presión arterial, IMC, colesterol (total, HDL, LDL), glucosa en ayunas y circunferencia de cintura. Los resultados se proporcionan inmediatamente y hay informes poblacionales agregados disponibles.",
        "Hypertension is the \"silent killer\" - millions of Americans are unaware they have it. Rapid blood pressure checks with physician-guided interpretation identify employees who need follow-up before serious events occur.":
            "La hipertensión es el \"asesino silencioso\" - millones de estadounidenses no saben que la tienen. Los controles rápidos de presión arterial con interpretación guiada por el médico identifican a los empleados que necesitan seguimiento antes de que ocurran eventos graves.",
        "On-site TB testing (TST placement and reading, or blood draw for IGRA) for healthcare and high-risk workforces. Supports annual healthcare worker health programs and new-employee clearance requirements.":
            "Pruebas de TB en el lugar (colocación y lectura de TST, o extracción de sangre para IGRA) para fuerzas laborales de salud y alto riesgo. Apoya programas anuales de salud para trabajadores de la salud y requisitos de autorización para nuevos empleados.",
        "Brief physician-led health counseling for employees with identified risk factors. Covers nutrition, physical activity, stress management, and medication adherence. Connects at-risk employees with appropriate follow-up resources.":
            "Asesoría breve de salud dirigida por un médico para empleados con factores de riesgo identificados. Cubre nutrición, actividad física, manejo del estrés y adherencia a medicamentos. Conecta a empleados en riesgo con recursos apropiados de seguimiento.",

    };

    // Build reverse map for EN restore
    var DICT_REVERSE = {};
    Object.keys(DICT).forEach(function(en) {
        DICT_REVERSE[DICT[en]] = en;
    });

    // ─── Attribute-based translation (data-en / data-es) ──────────────────────
    function applyAttribLang(lang) {
        document.querySelectorAll('[data-' + lang + ']').forEach(function (el) {
            var val = el.getAttribute('data-' + lang);
            if (val == null) return;
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = val;
            } else {
                el.innerHTML = val;
            }
        });
    }

    // ─── Dictionary-based translation ─────────────────────────────────────────
    // Walk every text node and replace matching strings using the dict.
    // Skip script/style/noscript. Tries longest-match first.
    var SORTED_KEYS = Object.keys(DICT).sort(function (a, b) { return b.length - a.length; });
    var SORTED_REVERSE_KEYS = Object.keys(DICT_REVERSE).sort(function (a, b) { return b.length - a.length; });

    // Short keys (≤ ~60 chars or ≤ 6 words) are treated as labels and only
    // replace when they are the ENTIRE trimmed text of a node. Longer keys
    // (full sentences / paragraphs) still work as substring replacements so
    // rich-inline markup like <a>…</a> inside a paragraph continues to match.
    // Rationale: prevents keys like "Insurance" → "Seguros" from corrupting
    // untranslated English paragraphs into Spanglish.
    function isShortKey(key) {
        if (key.length > 60) return false;
        var wordCount = key.split(/\s+/).filter(Boolean).length;
        return wordCount <= 6;
    }

    function normalizeForTranslation(value) {
        if (!value) return value;
        return value
            .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
            .replace(/[\u201C\u201D\u2033]/g, '"')
            .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
            .replace(/\u00A0/g, ' ');
    }

    function translateTextNode(node, dict, sortedKeys) {
        var text = node.nodeValue;
        if (!text || !text.trim()) return;
        var trimmed = text.trim();
        var trimmedLower = normalizeForTranslation(trimmed).toLowerCase();
        var changed = false;
        sortedKeys.forEach(function (key) {
            var val = dict[key];
            var keyLower = normalizeForTranslation(key).toLowerCase();

            if (isShortKey(key)) {
                // Only replace when the entire trimmed text node equals the key.
                if (trimmedLower === keyLower) {
                    var leading = text.match(/^\s*/)[0];
                    var trailing = text.match(/\s*$/)[0];
                    var original = trimmed;
                    var replacement = val;
                    if (original === original.toUpperCase() && original !== original.toLowerCase()) {
                        replacement = val.toUpperCase();
                    }
                    text = leading + replacement + trailing;
                    trimmed = replacement;
                    trimmedLower = normalizeForTranslation(replacement).toLowerCase();
                    changed = true;
                }
                return;
            }

            var normalizedText = normalizeForTranslation(text).toLowerCase();
            var idx = normalizedText.indexOf(keyLower);
            while (idx !== -1) {
                var original = text.substr(idx, key.length);
                var replacement = val;
                if (original === original.toUpperCase() && original !== original.toLowerCase()) {
                    replacement = val.toUpperCase();
                } else if (original[0] === original[0].toUpperCase() && original[1] && original[1] === original[1].toLowerCase()) {
                    replacement = val;
                }
                text = text.substr(0, idx) + replacement + text.substr(idx + key.length);
                changed = true;
                normalizedText = normalizeForTranslation(text).toLowerCase();
                idx = normalizedText.indexOf(keyLower, idx + replacement.length);
            }
        });
        if (changed) node.nodeValue = text;
    }

    function applyHtmlOverride(selector, lang, esHtml) {
        var el = document.querySelector(selector);
        if (!el) return;
        if (!el.dataset.langEnHtml) {
            el.dataset.langEnHtml = el.innerHTML;
        }
        el.innerHTML = (lang === 'es') ? esHtml : el.dataset.langEnHtml;
    }

    function applyPageSpecificOverrides(lang) {
        var path = window.location.pathname || '';
        if (path.indexOf('/faa-physicals/pilot-resources') !== -1) {
            applyHtmlOverride(
                '#classes .callout.callout-amber h4',
                lang,
                'La &quot;Regla de Reducci&oacute;n&quot; &mdash; No se deje en tierra'
            );
            applyHtmlOverride(
                '#classes .callout.callout-amber p:nth-of-type(1)',
                lang,
                'Su certificado m&eacute;dico FAA no simplemente vence &mdash; <strong class="text-gray-800">autom&aacute;ticamente desciende en privilegios</strong>. Cuando termina el per&iacute;odo de validez de su Clase 1, el mismo certificado se convierte en Clase 2. Cuando termina el per&iacute;odo de Clase 2, se convierte en Clase 3. Usted <em>no</em> necesita una nueva hoja de papel para que esto suceda.'
            );
            applyHtmlOverride(
                '#classes .callout.callout-amber p:nth-of-type(2)',
                lang,
                '<strong class="text-gray-800">Ejemplo:</strong> Si es un piloto de Clase 1 mayor de 40 a&ntilde;os y pierde su renovaci&oacute;n de 6 meses, a&uacute;n puede volar bajo <strong>Comercial (Clase 2)</strong> por otros 6 meses, o como <strong>Piloto Privado (Clase 3)</strong> por hasta otros 18 meses &mdash; todo con el mismo certificado.'
            );
            applyHtmlOverride(
                '#checklist .checklist-item:nth-child(8)',
                lang,
                '<span class="checklist-num">8</span><strong>Documentaci&oacute;n CACI (si aplica).</strong> Si tiene una <a href="#caci" class="text-link">condici&oacute;n calificada para CACI</a>, traiga una <strong>Nota de Progreso Cl&iacute;nico Detallada Actual (DCPN)</strong> de su m&eacute;dico tratante fechada dentro de los &uacute;ltimos <strong>90 d&iacute;as</strong>. La nota debe incluir: resumen del historial, hallazgos del examen cl&iacute;nico, resultados de pruebas, evaluaci&oacute;n y plan (con c&oacute;digos ICD-10), y una declaraci&oacute;n de efectos secundarios. Un &quot;After Visit Summary&quot; est&aacute;ndar <em>no</em> es suficiente.'
            );
            applyHtmlOverride(
                '#checklist .callout.callout-green p',
                lang,
                '<strong class="text-gray-800">Bueno saber:</strong> Los solicitantes deben tener al menos 16 a&ntilde;os y poder leer, hablar, escribir y entender ingl&eacute;s. <em>No</em> necesita traer su bit&aacute;cora de piloto. El examen m&eacute;dico de aviador no sustituye un examen f&iacute;sico preventivo anual con su m&eacute;dico de atenci&oacute;n primaria. El examen generalmente toma de 30 a 60 minutos.'
            );
        }
    }

    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };

    function walkAndTranslate(root, dict, sortedKeys) {
        var walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    var p = node.parentElement;
                    while (p) {
                        if (SKIP_TAGS[p.tagName]) return NodeFilter.FILTER_REJECT;
                        p = p.parentElement;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        var nodes = [];
        var n;
        while ((n = walker.nextNode())) nodes.push(n);
        nodes.forEach(function (node) { translateTextNode(node, dict, sortedKeys); });
    }

    // ─── Update toggle button label & aria ────────────────────────────────────
    function updateToggleUI(lang) {
        var label = document.getElementById('lang-label');
        var btn = document.getElementById('lang-toggle');
        if (label) label.textContent = (lang === 'en') ? 'Español' : 'English';
        if (btn) {
            btn.setAttribute('aria-label', (lang === 'en') ? 'Cambiar a Español' : 'Switch to English');
            btn.setAttribute('title', (lang === 'en') ? 'Español' : 'English');
        }
        document.documentElement.lang = (lang === 'es') ? 'es' : 'en';
    }

    // ─── Apply full translation ────────────────────────────────────────────────
    function applyLang(lang) {
        applyAttribLang(lang);
        if (lang === 'es') {
            walkAndTranslate(document.body, DICT, SORTED_KEYS);
        } else {
            walkAndTranslate(document.body, DICT_REVERSE, SORTED_REVERSE_KEYS);
        }
        applyPageSpecificOverrides(lang);
        updateToggleUI(lang);
    }

    // ─── Init toggle button ────────────────────────────────────────────────────
    function initLangToggle() {
        var btn = document.getElementById('lang-toggle');
        if (!btn || btn.dataset.langInit) return;
        btn.dataset.langInit = '1';

        var saved = localStorage.getItem('mmc-lang') || 'en';
        updateToggleUI(saved);
        if (saved === 'es') applyLang('es');

        btn.addEventListener('click', function () {
            var current = localStorage.getItem('mmc-lang') || 'en';
            var next = (current === 'en') ? 'es' : 'en';
            localStorage.setItem('mmc-lang', next);
            applyLang(next);
        });
    }

    // ─── Apply to page content at DOMContentLoaded ────────────────────────────
    function applyToPage() {
        var lang = localStorage.getItem('mmc-lang') || 'en';
        if (lang === 'es') {
            applyAttribLang('es');
            walkAndTranslate(document.body, DICT, SORTED_KEYS);
        }
        applyPageSpecificOverrides(lang);
        updateToggleUI(lang);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyToPage);
    } else {
        applyToPage();
    }

    // After header injects → init button
    document.addEventListener('mmc:header-ready', function () {
        initLangToggle();
        var lang = localStorage.getItem('mmc-lang') || 'en';
        if (lang === 'es') {
            applyAttribLang('es');
            walkAndTranslate(document.body, DICT, SORTED_KEYS);
        }
        applyPageSpecificOverrides(lang);
    });

    // After footer injects → re-apply
    window.mmcApplyLang = function () {
        var lang = localStorage.getItem('mmc-lang') || 'en';
        if (lang === 'es') {
            applyAttribLang('es');
            walkAndTranslate(document.body, DICT, SORTED_KEYS);
        }
        applyPageSpecificOverrides(lang);
    };

})();
