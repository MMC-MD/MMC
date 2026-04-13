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

        // ── Nutrition & Wellness page ──
        "Your Complete Wellness Journey at Our Wellness Center": "Su Viaje Completo de Bienestar en Nuestro Centro de Bienestar",
        "Our Two Divisions at the Wellness Center": "Nuestras Dos Divisiones en el Centro de Bienestar",
        "The Power of Integration": "El Poder de la Integración",
        "Meet Our Wellness Team": "Conozca a Nuestro Equipo de Bienestar",
        "Ready to Transform Your Health with Functional Medicine?": "¿Listo para Transformar Su Salud con Medicina Funcional?",
        "Book Nutrition Consultation": "Reservar Consulta de Nutrición",
        "Book Training Session": "Reservar Sesión de Entrenamiento",
        "Schedule Consultation": "Programar Consulta",
        "Nutrition & Dietetics": "Nutrición y Dietética",
        "Personal Training": "Entrenamiento Personal",
        "Functional Medicine": "Medicina Funcional",
        "Weight Management": "Control de Peso",
        "Personalized Nutrition Counseling": "Asesoramiento Nutricional Personalizado",
        "Weight Management Programs": "Programas de Control de Peso",
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
        "Meal Planning & Education": "Planificación de Comidas y Educación",
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

    function translateTextNode(node, dict, sortedKeys) {
        var text = node.nodeValue;
        if (!text || !text.trim()) return;
        var changed = false;
        sortedKeys.forEach(function (key) {
            var val = dict[key];
            var idx = text.toLowerCase().indexOf(key.toLowerCase());
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
                idx = text.toLowerCase().indexOf(key.toLowerCase(), idx + replacement.length);
            }
        });
        if (changed) node.nodeValue = text;
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
            updateToggleUI('es');
        }
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
    });

    // After footer injects → re-apply
    window.mmcApplyLang = function () {
        var lang = localStorage.getItem('mmc-lang') || 'en';
        if (lang === 'es') {
            applyAttribLang('es');
            walkAndTranslate(document.body, DICT, SORTED_KEYS);
        }
    };

})();
