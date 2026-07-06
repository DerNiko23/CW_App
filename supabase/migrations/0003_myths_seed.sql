-- Mythen-DB Seed (MASTERPLAN.md / ROADMAP.md Phase 1: "25-30 Mythen inkl. der 5 Beispiele
-- aus der Ausschreibung, je 2-3 seriöse Quellen"). Alle 5 Beispiele aus der Ausschreibung sind
-- enthalten: Honig macht nicht dick / Datteln enthalten keinen Zucker / Frühstück ist die
-- wichtigste Mahlzeit / Süßstoffe sind ungesund / Kohlenhydrate am Abend machen dick.
-- Quellen wurden per Web-Recherche verifiziert (Meta-Analysen/systematische Reviews bevorzugt,
-- sonst anerkannte Institutionen wie DGE, Cochrane, Harvard Health, EFSA, WHO, IQWiG).
-- Wie 0001/0002: im Supabase SQL Editor ausführen.

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Honig macht nicht dick und hat kaum Kalorien, weil er ''natürlich'' ist',
  'Ernährung',
  'Honig ist kein kalorienarmes Lebensmittel: 100 g enthalten rund 300-320 kcal, nur wenig weniger als Haushaltszucker (ca. 400 kcal). Er besteht chemisch größtenteils aus Frucht- und Traubenzucker und wird im Körper genauso verstoffwechselt wie normaler Zucker; entscheidend für die Gewichtsentwicklung ist die gesamte Kalorienbilanz, nicht die ''Natürlichkeit'' der Zuckerquelle. Die DGE stuft Honig ernährungsphysiologisch nicht als gesündere Alternative zu Zucker ein und empfiehlt, freie Zucker inklusive Honig auf unter 10 % der Tagesenergie zu begrenzen.',
  '[{"title":"DGE: Quantitative Empfehlung zur Zuckerzufuhr in Deutschland","url":"https://www.dge.de/wissenschaft/stellungnahmen-und-positionspapiere/stellungnahmen/quantitative-empfehlung-zur-zuckerzufuhr-in-deutschland/"},{"title":"Konsensuspapier Zucker – DAG, DDG, DGE (2018)","url":"https://www.dge.de/fileadmin/dok/wissenschaft/stellungnahmen/Konsensuspapier_Zucker_DAG_DDG_DGE_2018.pdf"},{"title":"AOK: Honig - gesunde Alternative oder Zuckerfalle?","url":"https://www.aok.de/pk/magazin/ernaehrung/lebensmittel/honig-gesunde-alternative-oder-zuckerfalle/"}]'::jsonb,
  '["Honig abnehmen","Honig Kalorien Mythos","Honig statt Zucker gesund"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Kohlenhydrate nach 18 Uhr machen automatisch dick',
  'Ernährung',
  'Es gibt keine wissenschaftliche Evidenz dafür, dass Kohlenhydrate zu einer bestimmten Uhrzeit stärker in Fett umgewandelt werden. Kontrollierte Studien zum Essenszeitpunkt zeigen, dass bei gleicher Kalorienzufuhr kein relevanter Unterschied im Gewichtsverlauf entsteht, unabhängig davon, wann gegessen wird. Der Effekt der Regel beruht meist darauf, dass durch den Verzicht auf die Abendmahlzeit ohnehin ein Kaloriendefizit entsteht - nicht auf der Tageszeit selbst.',
  '[{"title":"Meal Timing and Anthropometric and Metabolic Outcomes: A Systematic Review and Meta-Analysis (PMC)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC11530941/"},{"title":"Timing of Breakfast, Lunch, and Dinner. Effects on Obesity and Metabolic Risk (PMC)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC6893547/"},{"title":"FITBOOK: Keine Kohlenhydrate nach 18 Uhr - das sagt ein Experte","url":"https://www.fitbook.de/ernaehrung/keine-kohlenhydrate-nach-18-uhr-experte-antwortet"}]'::jsonb,
  '["keine Kohlenhydrate nach 18 Uhr","Kohlenhydrate abends dick","Low Carb abends Mythos"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Grapefruit vor dem Essen verbrennt gezielt Körperfett',
  'Ernährung',
  'Eine oft zitierte Studie aus 2006 zeigte nach 12 Wochen einen moderaten Gewichtsverlust von etwa 1,6 kg bei täglichem Verzehr einer halben Grapefruit vor den Mahlzeiten - deutlich weniger als es Diät-Werbung suggeriert. Der Effekt lässt sich vor allem durch die geringe Energiedichte und sättigende Wirkung der Frucht erklären, nicht durch angebliche ''fettverbrennende Enzyme''. Zudem kann Grapefruit gefährliche Wechselwirkungen mit vielen Medikamenten (z. B. Statinen) verursachen.',
  '[{"title":"Fujioka et al.: The Effects of Grapefruit on Weight and Insulin Resistance (J Med Food, 2006) - PubMed","url":"https://pubmed.ncbi.nlm.nih.gov/16579728/"},{"title":"Effects of grapefruit, grapefruit juice and water preloads on energy balance, weight loss, body composition, and cardiometabolic risk in free-living obese adults (PMC)","url":"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3039556/"}]'::jsonb,
  '["Grapefruit Diät abnehmen","Grapefruit Fettverbrennung","Hollywood Diät Grapefruit"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Mehrere kleine Mahlzeiten alle 2-3 Stunden kurbeln den Stoffwechsel an',
  'Ernährung',
  'Studien zur Mahlzeitenfrequenz zeigen keinen relevanten Unterschied im Energieverbrauch zwischen wenigen großen und vielen kleinen Mahlzeiten bei gleicher Gesamtkalorienzufuhr. Der thermische Effekt der Nahrung hängt von der verzehrten Kalorienmenge ab, nicht von der Anzahl der Mahlzeiten. Auch der Dietary Guidelines Advisory Committee kommt zu dem Schluss, dass keine ausreichende Evidenz für einen Zusammenhang zwischen Mahlzeitenhäufigkeit und Körpergewicht besteht.',
  '[{"title":"Effects of Meal Frequency on Metabolic Profiles and Substrate Partitioning in Lean Healthy Males (PLoS ONE, PMC)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC3374835/"},{"title":"IFIC: 4 Metabolism Myths, Busted","url":"https://ific.org/resources/articles/myths-about-your-metabolism/"}]'::jsonb,
  '["alle 3 Stunden essen Stoffwechsel","kleine Mahlzeiten abnehmen Mythos","Mahlzeitenfrequenz Stoffwechsel"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Frühstück ist die wichtigste Mahlzeit des Tages und unverzichtbar zum Abnehmen',
  'Ernährung',
  'Eine im British Medical Journal veröffentlichte Auswertung von 13 kontrollierten Studien fand keine belastbaren Beweise dafür, dass Frühstücken beim Abnehmen hilft oder Auslassen automatisch zu mehr Kalorienaufnahme führt. Beobachtungsstudien zeigen zwar einen Zusammenhang zwischen Frühstücksverzicht und einem leicht erhöhten Risiko für metabolisches Syndrom, belegen aber keine Kausalität. Der Ursprung des Mythos liegt in Marketing des frühen 20. Jahrhunderts, nicht in robuster Ernährungsforschung.',
  '[{"title":"Harvard Health: Skipping breakfast may increase risk for metabolic syndrome","url":"https://www.health.harvard.edu/diet-and-nutrition/skipping-breakfast-may-increase-risk-for-metabolic-syndrome"},{"title":"Medscape: Mythos vom Frühstück als wichtigste Mahlzeit - was ist dran?","url":"https://deutsch.medscape.com/artikelansicht/4905763"}]'::jsonb,
  '["Frühstück wichtigste Mahlzeit Mythos","Frühstück auslassen abnehmen","muss man frühstücken"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Detox-Tees und Detox-Kuren entgiften den Körper und reinigen Leber und Nieren',
  'Gesundheit',
  'Es gibt keine wissenschaftliche Evidenz, dass Detox-Tees, -Säfte oder -Kuren Giftstoffe aus dem Körper entfernen. Ein gesunder Körper verfügt mit Leber, Nieren, Haut und Darm über hocheffiziente eigene Entgiftungssysteme, die keine zusätzliche Unterstützung durch spezielle Produkte benötigen. Viele Detox-Tees wirken lediglich abführend oder entwässernd, was Gewichtsverlust nur durch Wasser- und Stuhlverlust vortäuscht und den Elektrolythaushalt stören kann.',
  '[{"title":"British Dietetic Association: Detox Diets Food Fact Sheet","url":"https://www.bda.uk.com/resource/detox-diets.html"},{"title":"Verbraucherzentrale: Detox - überflüssig oder doch gesünder durch Entgiftung?","url":"https://www.verbraucherzentrale.de/wissen/lebensmittel/nahrungsergaenzungsmittel/detox-ueberfluessig-oder-doch-gesuender-durch-entgiftung-25381"},{"title":"Universitätsklinikum Freiburg: Leber entgiften? Was wirklich hilft - und was nicht","url":"https://www.uniklinik-freiburg.de/presse/publikationen/im-fokus/leber-entgiften-was-wirklich-hilft-und-was-sie-nicht-braucht.html"}]'::jsonb,
  '["Detox Tee Wirkung","Körper entgiften Diät","Detox Kur abnehmen"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Fett in der Nahrung macht direkt fett und sollte möglichst vermieden werden',
  'Ernährung',
  'Nahrungsfett wird nicht automatisch in Körperfett umgewandelt; entscheidend für Gewichtszunahme ist ein Kalorienüberschuss, unabhängig davon, ob die Kalorien aus Fett, Kohlenhydraten oder Eiweiß stammen. Fett ist zudem essenziell für Zellmembranen, Hormonproduktion und die Aufnahme fettlöslicher Vitamine. Die pauschale Fett-Angst der 1980er/90er Jahre basierte auf methodisch schwachen Studien; heute betonen Fachgesellschaften wie die American Heart Association die Fettqualität statt der reinen Fettmenge.',
  '[{"title":"quarks.de: Fetthaltige Ernährung - was wissen wir wirklich?","url":"https://www.quarks.de/gesundheit/ernaehrung/fetthaltige-ernaehrung-fette-ungesaettigt-gesaettigt-transfette-fettsaeuren-ketogen/"},{"title":"Studentischer Arbeitskreis UGB: Fett macht Fett?! Mythos oder Wahrheit - eine ernährungswissenschaftliche Analyse","url":"https://studis.ugb.de/fettmachtfettmythos/"}]'::jsonb,
  '["Fett macht fett Mythos","fettarm abnehmen","gesättigte Fette dick"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Ein wöchentlicher Cheat Day ist notwendig, um den Stoffwechsel aktiv zu halten und einen Diät-Stillstand zu verhindern',
  'Ernährung',
  'Es gibt keinen belastbaren wissenschaftlichen Nachweis dafür, dass ein einzelner ''Cheat Day'' den Stoffwechsel dauerhaft ankurbelt oder für den Diäterfolg notwendig ist; ein kurzfristiger Kalorienüberschuss an einem Tag kann höchstens leichte, kurzzeitige hormonelle Effekte (z. B. Leptin) auslösen, die für die Gesamtbilanz kaum relevant sind. Ob ein Cheat Day hilft oder schadet, hängt stark von Menge und Häufigkeit ab; er kann die Einhaltung einer Diät psychologisch erleichtern, ist aber kein physiologisches Muss.',
  '[{"title":"EAT SMARTER: Mit Pizza und Pommes abnehmen - wie sinnvoll ist der Cheat Day?","url":"https://eatsmarter.de/abnehmen/diaeten/wie-sinnvoll-sind-cheat-days"},{"title":"Ernährungsradar: Mythen und Fakten - Diäten","url":"https://www.ernaehrungsradar.de/mythen-und-fakten-diaeten/"}]'::jsonb,
  '["Cheat Day sinnvoll","Cheat Day Stoffwechsel","Diät Cheat Day Mythos"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Apfelessig vor dem Essen verbrennt Fett und lässt Kilos purzeln',
  'Ernährung',
  'Die bekannteste Studie, die dramatischen Gewichtsverlust (6-8 kg in 12 Wochen) durch Apfelessig belegen sollte, wurde 2025 vom Fachjournal BMJ Nutrition, Prevention & Health zurückgezogen, nachdem Experten gravierende Fehler in Datenanalyse und Methodik fanden - der behauptete Effekt war zudem physiologisch unplausibel. Kleinere frühere Studien zeigten allenfalls moderate, kurzfristige Effekte auf Sättigung und Blutzucker, keine gezielte ''Fettverbrennung''. Unverdünnter Apfelessig kann zudem Zahnschmelz und Speiseröhre schädigen.',
  '[{"title":"Retraction Watch: Study on apple cider vinegar for weight loss retracted after many raise concerns","url":"https://retractionwatch.com/2025/09/23/apple-cider-vinegar-weight-loss-study-retracted-bmj/"},{"title":"BMJ Group retracts trial on apple cider vinegar and weight loss (Pressemitteilung)","url":"https://bmjgroup.com/bmj-group-retracts-trial-on-apple-cider-vinegar-and-weight-loss/"},{"title":"Apotheken Umschau: Abnehmen mit Apfelessig? Studie hinter Social-Media-Trend wegen vieler Fehler zurückgezogen","url":"https://www.apotheken-umschau.de/gesund-bleiben/ernaehrung/apfelessig-hilft-er-wirklich-beim-abnehmen-1085533.html"}]'::jsonb,
  '["Apfelessig abnehmen","Apfelessig Fettverbrennung","Apfelessig Diät Wirkung"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Wer eine Mahlzeit auslässt oder wenig isst, versetzt seinen Körper in den ''Hungermodus'' und verbrennt dadurch weniger Kalorien',
  'Ernährung',
  'Kurzfristiges Auslassen einzelner Mahlzeiten oder Fasten bis etwa 48 Stunden senkt den Grundumsatz nicht - manche Studien zeigen sogar einen leichten Anstieg des Stoffwechsels durch erhöhte Noradrenalin-Ausschüttung. Ein echter ''Hungerstoffwechsel'' mit spürbar reduziertem Energieverbrauch tritt erst bei sehr lang anhaltender, extremer Kalorienrestriktion über Wochen auf, nicht durch das Auslassen einzelner Mahlzeiten.',
  '[{"title":"gigasnutrition: ''Stoffwechselschäden'' und ''Hungermodus'' - widerlegt durch die Wissenschaft","url":"https://gigasnutrition.com/blogs/ernaehrung/stoffwechselschaden-und-hungermodus-widerlegt-durch-die-wissenschaft"},{"title":"science-fitness.de: Hungerstoffwechsel & eingeschlafener Stoffwechsel - was ist wirklich dran?","url":"https://science-fitness.de/abnehmen/eingeschlafener-kaputter-stoffwechsel-hungerstoffwechsel"}]'::jsonb,
  '["Hungermodus Stoffwechsel","Mahlzeit auslassen Stoffwechsel kaputt","eingeschlafener Stoffwechsel Mythos"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Zu viel Protein schädigt die Nieren bei gesunden Menschen',
  'Fitness',
  'Bei gesunden Menschen ohne bestehende Nierenerkrankung führt eine erhöhte Proteinzufuhr laut aktueller Studienlage nicht zu einer Verschlechterung der Nierenfunktion. Mehrere systematische Übersichtsarbeiten fanden keine negativen Veränderungen der glomerulären Filtrationsrate (GFR) bei hoher im Vergleich zu normaler Proteinzufuhr. Bei bereits vorgeschädigten Nieren gelten diese Ergebnisse jedoch nicht uneingeschränkt.',
  '[{"title":"Changes in Kidney Function Do Not Differ between Healthy Adults Consuming Higher- Compared with Lower- or Normal-Protein Diets: A Systematic Review and Meta-Analysis (The Journal of Nutrition, 2018)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC6236074/"},{"title":"A Systematic Review of Renal Health in Healthy Individuals Associated with Protein Intake above the US Recommended Daily Allowance in Randomized Controlled Trials and Observational Studies","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC6054213/"}]'::jsonb,
  '["zu viel Protein schädlich Nieren","Protein Nierenschaden Mythos","high protein Nieren gesund"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Muskelkater ist ein Zeichen für gutes bzw. effektives Training',
  'Fitness',
  'Muskelkater korreliert nur schwach mit dem tatsächlichen Ausmaß an Muskelschäden und noch schwächer mit Muskelwachstum. Studien zeigen, dass Hypertrophie auch ohne spürbaren Muskelkater auftritt und verschiedene Muskelgruppen trotz gleichen Trainingsreizes unterschiedlich stark schmerzen. Muskelkater ist daher kein verlässlicher Indikator für die Trainingsqualität.',
  '[{"title":"Delayed-onset muscle soreness does not reflect the magnitude of eccentric exercise-induced muscle damage (Scandinavian Journal of Medicine & Science in Sports, 2002)","url":"https://pubmed.ncbi.nlm.nih.gov/12453160/"},{"title":"Delayed Onset Muscle Soreness (DOMS) and The Repeated Bout Effect – Biolayne (Übersicht wissenschaftlicher Literatur zu DOMS und Hypertrophie)","url":"https://biolayne.com/articles/training/doms-repeated-bout-effect/"}]'::jsonb,
  '["Muskelkater gutes Training Zeichen","Muskelkater Muskelwachstum Mythos","kein Muskelkater trotzdem Erfolg"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Krafttraining macht Frauen zu muskulös bzw. unweiblich',
  'Fitness',
  'Frauen haben etwa 10- bis 20-mal weniger Testosteron als Männer, was ein starkes, unbeabsichtigtes Muskelwachstum in bodybuilder-artigem Ausmaß physiologisch stark limitiert. Krafttraining bei Frauen führt typischerweise zu einer strafferen Körperkomposition, mehr Kraft und gesundheitlichen Vorteilen, aber nicht zu übermäßiger Muskelmasse ohne gezielte, jahrelange Spezialisierung und oft zusätzliche Maßnahmen.',
  '[{"title":"Evolution of resistance training in women: History and mechanisms for health and performance (PMC, 2024)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC12421175/"},{"title":"Resistance training alters body composition in middle-aged women depending on menopause status – A 20-week control trial (PMC)","url":"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10559623/"}]'::jsonb,
  '["Krafttraining Frauen muskulös Mythos","Frauen werden männlich vom Gewichtheben","bulky werden Frauen Krafttraining"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Man kann gezielt Bauchfett oder Fett an bestimmten Stellen wegtrainieren (Spot Reduction)',
  'Fitness',
  'Eine systematische Übersichtsarbeit mit Meta-Analyse von 13 hochwertigen Studien fand keinen relevanten Unterschied im lokalen Fettabbau zwischen trainierten und untrainierten Gliedmaßen. Der Körper mobilisiert Fettreserven systemisch und nicht bevorzugt aus der trainierten Region – gezieltes Bauchmuskeltraining reduziert also nicht gezielt Bauchfett.',
  '[{"title":"A proposed model to test the hypothesis of exercise-induced localized fat reduction (spot reduction), including a systematic review with meta-analysis (2021)","url":"https://www.researchgate.net/publication/355379614_A_proposed_model_to_test_the_hypothesis_of_exercise-induced_localized_fat_reduction_spot_reduction_including_a_systematic_review_with_meta-analysis"},{"title":"Spot reduction: why targeting weight loss to a specific area is a myth – The University of Sydney","url":"https://www.sydney.edu.au/news-opinion/news/2023/11/07/spot-reduction--why-targeting-weight-loss-to-a-specific-area-is-.html"}]'::jsonb,
  '["Bauchfett gezielt wegtrainieren","Spot Reduction Mythos","Bauchübungen Fett am Bauch verlieren"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Man muss jeden Tag trainieren, um sichtbare Ergebnisse zu sehen',
  'Fitness',
  'Muskelwachstum findet vor allem in Erholungsphasen statt, nicht während des Trainings selbst – ohne ausreichende Regeneration steigt das Risiko für Übertraining und Verletzungen, während der Trainingsfortschritt stagniert. Metaanalysen zeigen, dass ein Muskel bei gleichem Gesamtvolumen etwa zweimal (nicht siebenmal) pro Woche trainiert werden sollte, um Hypertrophie zu maximieren; tägliches Training derselben Muskelgruppe bringt keinen zusätzlichen Nutzen.',
  '[{"title":"Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis (Schoenfeld, Ogborn & Krieger, Sports Medicine, 2016)","url":"https://pubmed.ncbi.nlm.nih.gov/27102172/"},{"title":"Equal-Volume Strength Training With Different Training Frequencies Induces Similar Muscle Hypertrophy and Strength Improvement in Trained Participants (Frontiers in Physiology, 2021)","url":"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8766679/"}]'::jsonb,
  '["jeden Tag trainieren für Ergebnisse","muss ich täglich ins Gym","Ruhetage nötig Muskelaufbau"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Statisches Dehnen vor dem Sport verhindert Verletzungen',
  'Fitness',
  'Eine systematische Übersichtsarbeit von Randomised-Controlled-Trials fand moderate bis starke Evidenz, dass statisches Dehnen als Teil des Aufwärmens die Gesamtverletzungsrate nicht reduziert. Statisches Dehnen unmittelbar vor dem Sport kann zudem kurzfristig die Kraft- und Sprungleistung verringern; dynamisches Aufwärmen gilt heute als sinnvollere Alternative.',
  '[{"title":"A systematic review into the efficacy of static stretching as part of a warm-up for the prevention of exercise-related injury (Research in Sports Medicine, 2008)","url":"https://pubmed.ncbi.nlm.nih.gov/18785063/"},{"title":"Practical recommendations on stretching exercise: A Delphi consensus statement of international research experts (ScienceDirect)","url":"https://www.sciencedirect.com/science/article/pii/S2095254625000468"}]'::jsonb,
  '["Dehnen vor dem Sport Verletzungen vermeiden","statisches Dehnen Aufwärmen Mythos","Stretching vor Training sinnvoll"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'No pain, no gain — ohne Schmerzen während des Trainings gibt es keinen Fortschritt',
  'Fitness',
  'Bereits moderate Bewegung ohne Schmerzen, etwa zügiges Gehen, senkt nachweislich das Herz-Kreislauf-Risiko in ähnlichem Ausmaß wie intensives Training. Schmerzen während des Trainings sind eher ein Warnsignal für Überlastung als ein Erfolgsmaßstab; anhaltende Schmerzen erhöhen das Verletzungsrisiko und können den Fortschritt sogar verlangsamen.',
  '[{"title":"No pain, no gain? Science debunks yet another exercise myth – Big Think","url":"https://bigthink.com/the-learning-curve/no-pain-no-gain-science-debunks-yet-another-exercise-myth/"},{"title":"No pain, no gain — a myth? – UCI Health","url":"https://www.ucihealth.org/blog/2019/04/no-pain-no-gain"}]'::jsonb,
  '["no pain no gain Mythos","Training ohne Schmerzen keine Ergebnisse","muss es beim Sport wehtun"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Kreatin schadet den Nieren',
  'Fitness',
  'Eine aktuelle systematische Übersichtsarbeit mit Meta-Analyse zeigt, dass Kreatin-Supplementierung zwar den Serum-Kreatinin-Wert leicht erhöht, die tatsächliche glomeruläre Filtrationsrate (GFR) als Goldstandard der Nierenfunktion aber unverändert bleibt. Bei gesunden Personen und Standard-Dosierungen gilt Kreatin nach aktueller Studienlage als sicher für die Nieren; Langzeitdaten über ein Jahr hinaus sind allerdings noch begrenzt.',
  '[{"title":"Effect of creatine supplementation on kidney function: a systematic review and meta-analysis (BMC Nephrology, 2025)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC12590749/"},{"title":"Risk of Adverse Outcomes in Females Taking Oral Creatine Monohydrate: A Systematic Review and Meta-Analysis (PMC)","url":"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7353222/"}]'::jsonb,
  '["Kreatin schädlich Nieren Mythos","Kreatin Nebenwirkungen Nierenschaden","ist Kreatin gefährlich"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Eiweißshakes bzw. Proteinpulver sind nur für Bodybuilder nötig',
  'Fitness',
  'Laut Positionspapier der International Society of Sports Nutrition liegt der sinnvolle Proteinbedarf für die meisten trainierenden Personen bei 1,4–2,0 g pro kg Körpergewicht täglich, was allein über die normale Ernährung oft schwer zu erreichen ist. Proteinpulver ist demnach für jede trainierende Person – nicht nur für Bodybuilder – eine praktische Möglichkeit, den Bedarf zu decken, aber kein zwingend notwendiges Supplement, wenn genug Protein über die Nahrung aufgenommen wird.',
  '[{"title":"International Society of Sports Nutrition Position Stand: protein and exercise (Journal of the ISSN, 2017)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/"}]'::jsonb,
  '["Proteinpulver nur für Bodybuilder","braucht man Eiweißshakes wirklich","Whey Protein sinnvoll Freizeitsportler"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Whey Protein verursacht Akne bzw. Hautprobleme',
  'Fitness',
  'Die Studienlage ist gemischt: Eine Fall-Kontroll-Studie fand einen statistischen Zusammenhang zwischen Whey-Protein-Konsum und Akne bei jungen Männern, während eine randomisierte, doppelblinde placebokontrollierte Studie über sechs Monate keinen signifikanten Unterschied im Schweregrad der Akne zwischen Whey- und Nicht-Whey-Gruppe fand. Ein pauschales „Whey verursacht Akne” ist damit nicht belegt, ein möglicher Zusammenhang bei manchen Personen aber auch nicht ausgeschlossen.',
  '[{"title":"Whey protein and male acne: A double-blind, randomized controlled trial (Journal of Dermatology, 2024)","url":"https://pubmed.ncbi.nlm.nih.gov/38291989/"},{"title":"The Effect of Whey Protein Supplements on Acne Vulgaris among Male Adolescents and Young Adults: A Case-Control Study from North of Jordan (PMC, 2024)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC11022506/"}]'::jsonb,
  '["Whey Protein Akne Pickel","Proteinpulver schlechte Haut","verursacht Eiweißpulver Hautprobleme"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Eier sind ungesund, weil sie den Cholesterinspiegel gefährlich erhöhen und das Herzinfarktrisiko steigern',
  'Ernährung',
  'Für die meisten gesunden Menschen erhöht ein moderater Eierkonsum (bis zu etwa einem Ei täglich) das Herz-Kreislauf-Risiko nicht wesentlich, da der Körper den Cholesterinspiegel über die körpereigene Produktion in der Leber reguliert. Aktuelle systematische Übersichtsarbeiten zeigen ein uneinheitliches Bild und mahnen vor allem bei Menschen mit Diabetes zu Vorsicht, weshalb pauschale Warnungen vor Eiern wissenschaftlich nicht haltbar sind.',
  '[{"title":"Egg consumption and risk of cardiovascular disease: three large prospective US cohort studies, systematic review, and updated meta-analysis (BMJ, 2020)","url":"https://pubmed.ncbi.nlm.nih.gov/32132002/"},{"title":"Eggs and Cardiovascular Disease Risk: An Update of Recent Evidence (PMC, 2023)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC10285014/"},{"title":"Deutsche Herzstiftung: Eier und Cholesterin – Schaden Eier der Gesundheit?","url":"https://herzstiftung.de/ihre-herzgesundheit/gesund-bleiben/cholesterin/eier-und-cholesterin"}]'::jsonb,
  '["Eier Cholesterin gefährlich","Eier schlecht fürs Herz","wie viele Eier pro Tag gesund"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Kokosöl ist gesund und sollte wegen der MCT-Fette bevorzugt zum Kochen verwendet werden',
  'Ernährung',
  'Kokosöl besteht zu rund 90 Prozent aus gesättigten Fettsäuren und erhöht das LDL-Cholesterin in kontrollierten Studien vergleichbar stark wie Butter oder Palmöl. Die American Heart Association rät ausdrücklich von der Verwendung von Kokosöl ab, da kein belegter Herz-Kreislauf-Nutzen den LDL-erhöhenden Effekt ausgleicht; die enthaltenen MCT-Fette (v. a. Laurinsäure) werden metabolisch teils wie langkettige Fettsäuren verarbeitet.',
  '[{"title":"Presidential Advisory: Dietary Fats and Cardiovascular Disease (Circulation, American Heart Association, 2017)","url":"https://www.ahajournals.org/doi/10.1161/CIR.0000000000000510"},{"title":"Are We Nuts Over Coconuts? Studying the Effects of Coconut Oil on LDL and Cardiovascular Diseases: A Systematic Review (PMC)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC9132222/"},{"title":"Randomised trial of coconut oil, olive oil or butter on blood lipids and other cardiovascular risk factors in healthy men and women (PMC)","url":"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5855206/"}]'::jsonb,
  '["Kokosöl gesund MCT","Kokosöl statt Butter kochen","ist Kokosöl ein Superfood"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Zucker macht süchtig wie eine Droge',
  'Ernährung',
  'Zucker aktiviert im Gehirn ähnliche Belohnungsmechanismen wie Suchtstoffe, doch die meisten Belege stammen aus Tierstudien mit isoliertem Zucker in unnatürlichen Mengen. Beim Menschen gibt es kein konsistentes Suchtsyndrom für Zucker allein; problematisches Essverhalten betrifft eher stark verarbeitete, fett- und zuckerreiche Lebensmittelkombinationen, weshalb Fachleute die pauschale Gleichsetzung mit Drogensucht als wissenschaftlich nicht belegt einstufen.',
  '[{"title":"Spektrum der Wissenschaft: Ernährung – Macht Zucker süchtig?","url":"https://www.spektrum.de/magazin/ernaehrung-macht-zucker-suechtig/1519041"},{"title":"drugcom.de: Süchtig nach Zucker?","url":"https://www.drugcom.de/newsuebersicht/topthemen/suechtig-nach-zucker/"}]'::jsonb,
  '["Zucker Droge Sucht","Zuckersucht Gehirn","ist Zucker so schlimm wie Kokain"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Gluten ist für alle Menschen ungesund, nicht nur für Zöliakie-Betroffene',
  'Ernährung',
  'Für Menschen ohne Zöliakie oder nachgewiesene Glutensensitivität gibt es keine überzeugende Evidenz, dass eine glutenfreie Ernährung gesünder ist oder Krankheiten vorbeugt. Placebokontrollierte Studien zeigen zudem einen starken Nocebo-Effekt: Beschwerden treten oft auch bei glutenfreien Placebos auf, was auf Erwartungseffekte statt echte Glutenunverträglichkeit hindeutet.',
  '[{"title":"Harvard Health: Considering a gluten-free diet","url":"https://www.health.harvard.edu/diseases-and-conditions/considering-a-gluten-free-diet"},{"title":"Ärzteblatt/CME: Ist die Glutensensitivität ein Nocebo-Phänomen?","url":"https://www.aerztezeitung.de/Medizin/Ist-die-Glutensensitivitaet-ein-Nocebo-Phaenomen-459746.html"},{"title":"AkdÄ: Die „Nicht-Zöliakie-Glutensensitivität” (NCGS)","url":"https://www.akdae.de/arzneimitteltherapie/arzneiverordnung-in-der-praxis/ausgaben-archiv/ausgaben-ab-2015/ausgabe/artikel/2018/2018-02/die-nicht-zoliakie-glutensensitivitat-ncgs"}]'::jsonb,
  '["Gluten ungesund","glutenfrei ohne Zöliakie sinnvoll","Gluten Bauchschmerzen Mythos"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Vitamin C hilft gegen Erkältungen und verhindert sie',
  'Gesundheit',
  'Laut Cochrane-Review schützt eine regelmäßige Vitamin-C-Einnahme die meisten Menschen nicht vor Erkältungen; sie verkürzt die Krankheitsdauer nur geringfügig (Erwachsene ca. 8%, Kinder ca. 14%). Wird Vitamin C erst bei Symptombeginn eingenommen, zeigt sich kein Nutzen. Eine Ausnahme bilden Extremsportler und Soldaten unter starker Kälte- und Belastungsexposition, bei denen eine vorbeugende Einnahme das Erkältungsrisiko etwa halbieren kann.',
  '[{"title":"Cochrane Review: Vitamin C for preventing and treating the common cold (Hemilä & Chalker)","url":"https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000980.pub4/full"},{"title":"IQWiG / gesundheitsinformation.de: Schützt Vitamin C vor Erkältungen?","url":"https://www.gesundheitsinformation.de/schuetzt-vitamin-c-vor-erkaeltungen.html"}]'::jsonb,
  '["Vitamin C gegen Erkältung","Vitamin C Immunsystem stärken","hilft Vitamin C wirklich bei Erkältung"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Gesunde Menschen brauchen täglich Multivitamin-Präparate, um ausreichend versorgt zu sein',
  'Ernährung',
  'Bei ausgewogener Ernährung sind Multivitaminpräparate für gesunde Erwachsene in der Regel überflüssig, da der Nährstoffbedarf über die normale Nahrung gedeckt wird. Große Beobachtungsstudien konnten keinen Lebensverlängerungseffekt durch tägliche Multivitamin-Einnahme nachweisen; Ausnahmen gelten für spezifische Gruppen wie Schwangere (Folsäure) oder Veganer (Vitamin B12).',
  '[{"title":"NZZ: Sind Vitaminpräparate eigentlich sinnvoll? Weshalb sie mehr schaden als nützen","url":"https://www.nzz.ch/wissenschaft/vitaminpraeparate-weshalb-nahrungsergaenzungsmittel-mehr-schaden-als-nuetzen-ld.1822343"},{"title":"Food supplements and fortified foods: benefits, risks and approaches to consumer protection (PMC)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC12583368/"},{"title":"BARMER: Nahrungsergänzungsmittel – Nutzen oder Risiko?","url":"https://www.barmer.de/gesundheit-verstehen/leben/ernaehrung/nahrungsergaenzungsmittel-1055892"}]'::jsonb,
  '["Multivitamin täglich nötig","braucht man Nahrungsergänzungsmittel","Vitaminpräparate sinnvoll"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Rohkost ist immer gesünder als gekochtes Gemüse',
  'Ernährung',
  'Ob roh oder gekocht gesünder ist, hängt vom jeweiligen Gemüse und Nährstoff ab: Manche hitzeempfindlichen Stoffe wie Vitamin C oder Sulforaphan gehen beim Kochen teilweise verloren, während andere wie Beta-Carotin in Karotten oder Lycopin in Tomaten durch Erhitzen erst besser verfügbar werden. Eine pauschale Überlegenheit von Rohkost ist daher wissenschaftlich nicht haltbar, und rein rohköstliche Ernährung kann sogar zu Nährstoffmängeln führen.',
  '[{"title":"Quarks: Rohkost – Wie viel ist gesund?","url":"https://www.quarks.de/gesundheit/ernaehrung/rohkost-wie-viel-ist-gesund/"},{"title":"ÖKO-TEST: Rohkost – Manche Gemüsesorten sind roh gesünder als gekocht","url":"https://www.oekotest.de/essen-trinken/Rohkost-Manche-Gemuesesorten-sind-roh-gesuender-als-gekocht_14918_1.html"}]'::jsonb,
  '["Rohkost gesünder als gekocht","rohes Gemüse vs gekochtes Gemüse","Vitamine verlieren beim Kochen"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Man muss jeden Tag mindestens 8 Gläser (ca. 2 Liter) Wasser trinken, sonst ist man dehydriert',
  'Gesundheit',
  'Die pauschale Regel von acht Gläsern Wasser täglich beruht nicht auf robuster wissenschaftlicher Evidenz, sondern eher auf vereinfachten Faustregeln und Marketing. Der tatsächliche Flüssigkeitsbedarf ist individuell sehr unterschiedlich und hängt von Körpergewicht, Aktivität, Klima und der Nahrung ab; die EFSA empfiehlt Richtwerte von ca. 2,0 Litern (Frauen) bzw. 2,5 Litern (Männer) Gesamtwasserzufuhr, wovon ein erheblicher Teil bereits über feste Nahrung aufgenommen wird.',
  '[{"title":"EFSA: Scientific Opinion on Dietary Reference Values for water","url":"https://www.efsa.europa.eu/en/efsajournal/pub/1459"},{"title":"National Geographic: Müssen wir täglich weniger trinken als gedacht?","url":"https://nationalgeographic.de/wissenschaft/2022/12/muessen-wir-taeglich-weniger-trinken-als-gedacht/"},{"title":"Verbraucherzentrale: Wie viel sollte man am Tag trinken?","url":"https://www.verbraucherzentrale.de/wissen/lebensmittel/gesund-ernaehren/wie-viel-sollte-man-am-tag-trinken-24202"}]'::jsonb,
  '["8 Gläser Wasser am Tag Mythos","wie viel Wasser trinken pro Tag","muss man 2 Liter Wasser trinken"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Basische/alkalische Ernährung verändert den pH-Wert des Körpers und macht dadurch gesünder',
  'Ernährung',
  'Der Blut-pH-Wert wird beim gesunden Menschen durch Lunge und Nieren extrem eng reguliert (7,35–7,45) und lässt sich durch die Ernährung nicht nennenswert verändern; eine gefährliche „Übersäuerung” durch normale Ernährung tritt bei gesunden Menschen nicht auf. Kontrollierte Studien fanden keinen belegten Zusatznutzen basischer Diäten oder „Basenkuren” über die Vorteile einer allgemein pflanzenreichen Ernährung hinaus.',
  '[{"title":"Quarks: Darum sind viele Säure-Basen-Kuren Quatsch","url":"https://www.quarks.de/gesundheit/ernaehrung/darum-sind-viele-saeure-basen-kuren-quatsch/"},{"title":"Apotheken-Umschau: Basische Ernährung gegen Übersäuerung des Körpers – Mythos oder Realität?","url":"https://www.apotheken-umschau.de/gesund-bleiben/ernaehrung/basische-ernaehrung-braucht-koerper-hilfe-gegen-uebersaeuerung-1462441.html"}]'::jsonb,
  '["basische Ernährung pH-Wert","Übersäuerung des Körpers","Basenfasten Wirkung"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Bei Laktoseintoleranz muss man komplett auf Milchprodukte verzichten',
  'Ernährung',
  'Die meisten Menschen mit Laktoseintoleranz vertragen kleinere Laktosemengen (z. B. bis zu 12 g pro Mahlzeit, verteilt über den Tag) durchaus ohne Beschwerden, insbesondere wenn Milchprodukte zusammen mit anderen Lebensmitteln gegessen werden. Ein kompletter Verzicht ist daher meist unnötig und kann sogar die Calciumversorgung erschweren; individuelles Austesten der Toleranzgrenze wird empfohlen.',
  '[{"title":"IQWiG: Menschen mit Laktoseintoleranz müssen nicht ganz auf Milchprodukte verzichten","url":"https://www.iqwig.de/presse/pressemitteilungen/pressemitteilungen-detailseite_10881.html"},{"title":"Gesundheitsinformation.de: Ernährung bei Laktoseintoleranz","url":"https://www.gesundheitsinformation.de/ernaehrung-bei-laktoseintoleranz.html"}]'::jsonb,
  '["Laktoseintoleranz Milch komplett verzichten","laktosefreie Ernährung nötig","Milchprodukte bei Laktoseintoleranz"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Datteln enthalten keinen Zucker',
  'Ernährung',
  'Datteln bestehen zu einem großen Teil aus natürlichem Zucker: Getrocknete Datteln enthalten je nach Sorte ca. 65-80 g Kohlenhydrate pro 100 g, davon rund 25 g Fruktose und 25 g Glukose - sie zählen damit zu den zuckerreichsten Trockenfrüchten überhaupt. Die Aussage, sie enthielten ''keinen Zucker'', ist damit eindeutig falsch. Richtig ist, dass der hohe Ballaststoffanteil die Blutzuckeraufnahme verlangsamt und Datteln zusätzlich Kalium, Magnesium und Antioxidantien liefern - das macht sie ernährungsphysiologisch wertvoll, aber nicht zuckerfrei.',
  '[{"title":"Nutritional, nutraceutical attributes, microbiological and chemical safety of different varieties of dates – A review (ScienceDirect)","url":"https://www.sciencedirect.com/science/article/pii/S2666833524001278"},{"title":"Date fruit: a review of the chemical and nutritional compounds, functional effects and food application in nutrition bars for athletes (International Journal of Food Science & Technology, 2021)","url":"https://ifst.onlinelibrary.wiley.com/doi/10.1111/ijfs.14783"},{"title":"AOK: Datteln - Wie gesund sind Datteln und wieviel Kalorien haben sie?","url":"https://www.aok.de/pk/magazin/ernaehrung/obstgemuese/datteln-wie-gesund-sind-datteln-und-wieviel-kalorien-haben-sie/"}]'::jsonb,
  '["Datteln kein Zucker Mythos","Datteln gesunder Zuckerersatz","wie viel Zucker haben Datteln"]'::jsonb,
  false
);

insert into myths (claim_pattern, category, verdict, sources_json, search_queries, covered_by_chris) values (
  'Süßstoffe sind ungesund',
  'Ernährung',
  'Diese pauschale Aussage wird der Studienlage nicht gerecht - in beide Richtungen. Zugelassene Süßstoffe (u. a. Aspartam) gelten laut EFSA-Neubewertung 2013 innerhalb der festgelegten Tagesdosis (ADI) als sicher, ein Krebsrisiko beim Menschen ist nicht belegt. Gleichzeitig sind pauschale ''völlig unbedenklich''-Aussagen ebenfalls überholt: Die WHO rät seit ihrer Leitlinie von 2023 explizit von Süßstoffen zur Gewichtskontrolle ab, da die zugrundeliegende systematische Übersichtsarbeit mögliche Risiken für Typ-2-Diabetes, Herz-Kreislauf-Erkrankungen und Sterblichkeit bei langfristigem, hohem Konsum fand; die große NutriNet-Santé-Kohortenstudie (über 100.000 Teilnehmende, BMJ 2022) fand ebenfalls ein erhöhtes kardiovaskuläres Risiko bei hoher Süßstoffzufuhr. Weder ''komplett gefährlich'' noch ''völlig harmlos'' ist durch die aktuelle Evidenz gedeckt - entscheidend sind Menge und Häufigkeit.',
  '[{"title":"WHO: Use of non-sugar sweeteners - WHO guideline (2023)","url":"https://www.who.int/publications/i/item/9789240073616"},{"title":"Debras et al.: Artificial sweeteners and risk of cardiovascular diseases - results from the prospective NutriNet-Santé cohort (BMJ, 2022)","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC9449855/"},{"title":"EFSA: Scientific Opinion on the re-evaluation of aspartame (E 951) as a food additive (2013)","url":"https://www.efsa.europa.eu/en/efsajournal/pub/3496"}]'::jsonb,
  '["Süßstoffe ungesund","Aspartam gefährlich Krebs","Süßstoffe Nebenwirkungen Studie"]'::jsonb,
  false
);
