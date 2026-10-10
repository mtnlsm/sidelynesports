// UFC fighters: [name, division]. Names match ESPN's scoreboard names (accents ignored) so live status can be shown.
window.UFC_FIGHTERS = [
  // Heavyweight
  ['Jon Jones','Heavyweight'],['Stipe Miocic','Heavyweight'],['Francis Ngannou','Heavyweight'],['Cain Velasquez','Heavyweight'],
  ['Tom Aspinall','Heavyweight'],['Ciryl Gane','Heavyweight'],['Junior dos Santos','Heavyweight'],['Brock Lesnar','Heavyweight'],
  ['Randy Couture','Heavyweight'],['Derrick Lewis','Heavyweight'],['Alistair Overeem','Heavyweight'],['Frank Mir','Heavyweight'],
  ['Curtis Blaydes','Heavyweight'],['Sergei Pavlovich','Heavyweight'],['Alexander Volkov','Heavyweight'],['Tai Tuivasa','Heavyweight'],
  ['Marcin Tybura','Heavyweight'],['Serghei Spivac','Heavyweight'],['Jairzinho Rozenstruik','Heavyweight'],['Shamil Gaziev','Heavyweight'],
  ['Mark Hunt','Heavyweight'],['Andrei Arlovski','Heavyweight'],['Josh Barnett','Heavyweight'],['Tim Sylvia','Heavyweight'],
  ['Mirko Cro Cop','Heavyweight'],['Fabricio Werdum','Heavyweight'],['Shane Carwin','Heavyweight'],['Roy Nelson','Heavyweight'],
  ['Waldo Cortes-Acosta','Heavyweight'],['Justin Tafa','Heavyweight'],
  // Light Heavyweight
  ['Daniel Cormier','Light Heavyweight'],['Alex Pereira','Light Heavyweight'],['Jiri Prochazka','Light Heavyweight'],['Glover Teixeira','Light Heavyweight'],
  ['Jan Blachowicz','Light Heavyweight'],['Magomed Ankalaev','Light Heavyweight'],['Jamahal Hill','Light Heavyweight'],['Alexander Gustafsson','Light Heavyweight'],
  ['Chuck Liddell','Light Heavyweight'],['Quinton Jackson','Light Heavyweight'],['Mauricio Rua','Light Heavyweight'],['Lyoto Machida','Light Heavyweight'],
  ['Rashad Evans','Light Heavyweight'],['Vitor Belfort','Light Heavyweight'],['Forrest Griffin','Light Heavyweight'],['Wanderlei Silva','Light Heavyweight'],
  ['Anthony Smith','Light Heavyweight'],['Corey Anderson','Light Heavyweight'],['Dominick Reyes','Light Heavyweight'],['Johnny Walker','Light Heavyweight'],
  ['Khalil Rountree Jr.','Light Heavyweight'],['Carlos Ulberg','Light Heavyweight'],['Nikita Krylov','Light Heavyweight'],['Volkan Oezdemir','Light Heavyweight'],
  ['Thiago Santos','Light Heavyweight'],['Tito Ortiz','Light Heavyweight'],['Rich Franklin','Light Heavyweight'],
  ['Bruno Silva','Light Heavyweight'],
  // Middleweight
  ['Anderson Silva','Middleweight'],['Israel Adesanya','Middleweight'],['Dricus du Plessis','Middleweight'],['Sean Strickland','Middleweight'],
  ['Robert Whittaker','Middleweight'],['Chris Weidman','Middleweight'],['Michael Bisping','Middleweight'],['Khamzat Chimaev','Middleweight'],
  ['Paulo Costa','Middleweight'],['Luke Rockhold','Middleweight'],['Yoel Romero','Middleweight'],['Dan Henderson','Middleweight'],
  ['Jared Cannonier','Middleweight'],['Marvin Vettori','Middleweight'],['Nassourdine Imavov','Middleweight'],['Kelvin Gastelum','Middleweight'],
  ['Jack Hermansson','Middleweight'],['Bo Nickal','Middleweight'],['Chris Curtis','Middleweight'],['Roman Dolidze','Middleweight'],
  ['Caio Borralho','Middleweight'],['Reinier de Ridder','Middleweight'],['Brendan Allen','Middleweight'],['Chael Sonnen','Middleweight'],
  ['Uriah Hall','Middleweight'],['Costas Philippou','Middleweight'],['Jorge Masvidal','Welterweight'],
  // Welterweight
  ['Georges St-Pierre','Welterweight'],['Kamaru Usman','Welterweight'],['Leon Edwards','Welterweight'],['Belal Muhammad','Welterweight'],
  ['Jack Della Maddalena','Welterweight'],['Shavkat Rakhmonov','Welterweight'],['Colby Covington','Welterweight'],
  ['Gilbert Burns','Welterweight'],['Matt Hughes','Welterweight'],['Johny Hendricks','Welterweight'],['Robbie Lawler','Welterweight'],
  ['Carlos Condit','Welterweight'],['Tyron Woodley','Welterweight'],['Nick Diaz','Welterweight'],['Ian Machado Garry','Welterweight'],
  ['Stephen Thompson','Welterweight'],['Michael Page','Welterweight'],['Geoff Neal','Welterweight'],['Sean Brady','Welterweight'],
  ['Kevin Holland','Welterweight'],['Neil Magny','Welterweight'],['Vicente Luque','Welterweight'],['Joaquin Buckley','Welterweight'],
  ['Ikram Aliskerov','Welterweight'],['Carlos Prates','Welterweight'],['Rafael dos Anjos','Welterweight'],['Demian Maia','Welterweight'],
  ['Matt Serra','Welterweight'],['BJ Penn','Welterweight'],['Josh Koscheck','Welterweight'],['Thiago Alves','Welterweight'],
  ['Jake Matthews','Welterweight'],['Daniel Rodriguez','Welterweight'],['Muslim Salikhov','Welterweight'],
  // Lightweight
  ['Khabib Nurmagomedov','Lightweight'],['Islam Makhachev','Lightweight'],['Charles Oliveira','Lightweight'],['Conor McGregor','Lightweight'],
  ['Dustin Poirier','Lightweight'],['Justin Gaethje','Lightweight'],['Michael Chandler','Lightweight'],['Tony Ferguson','Lightweight'],
  ['Eddie Alvarez','Lightweight'],['Frankie Edgar','Lightweight'],['Benson Henderson','Lightweight'],
  ['Nate Diaz','Lightweight'],['Paddy Pimblett','Lightweight'],['Arman Tsarukyan','Lightweight'],['Dan Hooker','Lightweight'],
  ['Beneil Dariush','Lightweight'],['Mateusz Gamrot','Lightweight'],['Rafael Fiziev','Lightweight'],['Renato Moicano','Lightweight'],
  ['Gregor Gillespie','Lightweight'],['Jim Miller','Lightweight'],['Donald Cerrone','Lightweight'],['Clay Guida','Lightweight'],
  ['Joe Lauzon','Lightweight'],['Kevin Lee','Lightweight'],['Gray Maynard','Lightweight'],['Diego Sanchez','Lightweight'],
  ['Sean Sherk','Lightweight'],['Kenny Florian','Lightweight'],['Evan Dunham','Lightweight'],['Grant Dawson','Lightweight'],
  ['Ilia Topuria','Lightweight'],['Chase Hooper','Lightweight'],['Ludovit Klein','Lightweight'],['Jalin Turner','Lightweight'],
  ['King Green','Lightweight'],['Terrance McKinney','Lightweight'],['Mauricio Ruffy','Lightweight'],['Gilbert Urbina','Lightweight'],
  // Featherweight
  ['Jose Aldo','Featherweight'],['Alexander Volkanovski','Featherweight'],['Max Holloway','Featherweight'],
  ['Brian Ortega','Featherweight'],['Yair Rodriguez','Featherweight'],['Diego Lopes','Featherweight'],['Movsar Evloev','Featherweight'],
  ['Josh Emmett','Featherweight'],['Calvin Kattar','Featherweight'],['Arnold Allen','Featherweight'],['Bryce Mitchell','Featherweight'],
  ['Chan Sung Jung','Featherweight'],['Giga Chikadze','Featherweight'],['Lerone Murphy','Featherweight'],['Zabit Magomedsharipov','Featherweight'],
  ['Cub Swanson','Featherweight'],['Dennis Siver','Featherweight'],['Chad Mendes','Featherweight'],['Ricardo Lamas','Featherweight'],
  ['Jean Silva','Featherweight'],['Aljamain Sterling','Featherweight'],['Dan Ige','Featherweight'],['Edson Barboza','Featherweight'],
  // Bantamweight
  ['Dominick Cruz','Bantamweight'],['T.J. Dillashaw','Bantamweight'],['Henry Cejudo','Bantamweight'],
  ["Sean O'Malley",'Bantamweight'],['Merab Dvalishvili','Bantamweight'],['Petr Yan','Bantamweight'],['Urijah Faber','Bantamweight'],
  ['Cory Sandhagen','Bantamweight'],['Marlon Vera','Bantamweight'],['Umar Nurmagomedov','Bantamweight'],['Song Yadong','Bantamweight'],
  ['Raoni Barcelos','Bantamweight'],['Mario Bautista','Bantamweight'],['Rob Font','Bantamweight'],['Marlon Moraes','Bantamweight'],
  ['Cody Garbrandt','Bantamweight'],['Renan Barao','Bantamweight'],['Eddie Wineland','Bantamweight'],
  ['Pedro Munhoz','Bantamweight'],['Miesha Tate','Bantamweight'],
  // Flyweight
  ['Demetrious Johnson','Flyweight'],['Deiveson Figueiredo','Flyweight'],['Brandon Moreno','Flyweight'],['Alexandre Pantoja','Flyweight'],
  ['Kai Kara-France','Flyweight'],['Brandon Royval','Flyweight'],['Amir Albazi','Flyweight'],['Manel Kape','Flyweight'],
  ['Tatsuro Taira','Flyweight'],['Joshua Van','Flyweight'],['Steve Erceg','Flyweight'],['Kai Asakura','Flyweight'],
  ['Joseph Benavidez','Flyweight'],['Jussier Formiga','Flyweight'],['Askar Askarov','Flyweight'],
  // Women's divisions
  ['Amanda Nunes',"Women's Bantamweight"],['Ronda Rousey',"Women's Bantamweight"],['Holly Holm',"Women's Bantamweight"],['Julianna Pena',"Women's Bantamweight"],
  ['Kayla Harrison',"Women's Bantamweight"],['Raquel Pennington',"Women's Bantamweight"],['Germaine de Randamie',"Women's Bantamweight"],
  ['Cat Zingano',"Women's Bantamweight"],['Ketlen Vieira',"Women's Bantamweight"],['Macy Chiasson',"Women's Bantamweight"],['Norma Dumont',"Women's Bantamweight"],
  ['Cris Cyborg',"Women's Featherweight"],
  ['Valentina Shevchenko',"Women's Flyweight"],['Alexa Grasso',"Women's Flyweight"],['Manon Fiorot',"Women's Flyweight"],
  ['Erin Blanchfield',"Women's Flyweight"],['Maycee Barber',"Women's Flyweight"],['Natalia Silva',"Women's Flyweight"],
  ['Jessica Andrade',"Women's Flyweight"],['Viviane Araujo',"Women's Flyweight"],['Katlyn Cerminara',"Women's Flyweight"],
  ['Zhang Weili',"Women's Strawweight"],['Joanna Jedrzejczyk',"Women's Strawweight"],['Rose Namajunas',"Women's Strawweight"],
  ['Carla Esparza',"Women's Strawweight"],['Tatiana Suarez',"Women's Strawweight"],['Mackenzie Dern',"Women's Strawweight"],
  ['Amanda Ribas',"Women's Strawweight"],['Yan Xiaonan',"Women's Strawweight"],['Virna Jandiroba',"Women's Strawweight"],
  ['Paige VanZant',"Women's Strawweight"],['Michelle Waterson-Gomez',"Women's Strawweight"],['Tecia Pennington',"Women's Strawweight"],
  ['Marina Rodriguez',"Women's Strawweight"],['Jessica Penne',"Women's Strawweight"],['Angela Hill',"Women's Strawweight"],
  ['Gillian Robertson',"Women's Strawweight"],['Loopy Godinez',"Women's Strawweight"],
  // Legends
  ['Royce Gracie','Legend'],['Ken Shamrock','Legend'],['Mark Coleman','Legend'],['Dan Severn','Legend'],['Don Frye','Legend'],
  ['Pat Miletich','Legend'],['Tank Abbott','Legend'],['Kimbo Slice','Legend'],['Gina Carano','Legend'],['Pete Williams','Legend']
];
// Old name -> name ESPN uses now. Add a line here whenever a fighter's name changes.
window.UFC_ALIASES = { 'Bobby Green':'King Green' };
// Back-compat for older code
window.UFC_TOP100 = window.UFC_FIGHTERS;

// Household names — shown first when the search box is empty, in this order.
window.UFC_POPULAR = [
  'Conor McGregor','Jon Jones','Khabib Nurmagomedov','Israel Adesanya','Nate Diaz','Ronda Rousey','Amanda Nunes','Georges St-Pierre',
  'Anderson Silva','Francis Ngannou','Islam Makhachev','Alex Pereira',"Sean O'Malley",'Ilia Topuria','Max Holloway','Alexander Volkanovski',
  'Charles Oliveira','Dustin Poirier','Justin Gaethje','Tom Aspinall','Khamzat Chimaev','Paddy Pimblett','Sean Strickland','Merab Dvalishvili',
  'Daniel Cormier','Brock Lesnar','Chuck Liddell','Quinton Jackson','Jorge Masvidal','Kamaru Usman','Leon Edwards','Belal Muhammad',
  'Valentina Shevchenko','Zhang Weili','Kayla Harrison','Holly Holm','Julianna Pena','Michael Chandler','Colby Covington','Michael Bisping',
  'Chael Sonnen','Tony Ferguson','Cris Cyborg','Henry Cejudo','Petr Yan','Dricus du Plessis','Robert Whittaker','Stipe Miocic',
  'Derrick Lewis','Jose Aldo','Randy Couture','Royce Gracie','Forrest Griffin','Wanderlei Silva','Dominick Cruz','Demetrious Johnson',
  'Jiri Prochazka','Magomed Ankalaev','Shavkat Rakhmonov','Ian Machado Garry','Bo Nickal','Bryce Mitchell','Paige VanZant','Diego Lopes'
];
// Nicknames — searchable (e.g. type "notorious" or "bones").
window.UFC_NICKS = {
  'Conor McGregor':'The Notorious','Jon Jones':'Bones','Khabib Nurmagomedov':'The Eagle','Israel Adesanya':'The Last Stylebender',
  'Nate Diaz':'Stockton Slap','Ronda Rousey':'Rowdy','Amanda Nunes':'The Lioness','Georges St-Pierre':'GSP Rush','Anderson Silva':'The Spider',
  'Francis Ngannou':'The Predator','Alex Pereira':'Poatan','Sean O\'Malley':'Sugar','Ilia Topuria':'El Matador',
  'Max Holloway':'Blessed','Alexander Volkanovski':'The Great','Charles Oliveira':'do Bronx','Dustin Poirier':'The Diamond','Justin Gaethje':'The Highlight',
  'Khamzat Chimaev':'Borz Wolf','Paddy Pimblett':'The Baddy','Sean Strickland':'Tarzan','Merab Dvalishvili':'The Machine','Daniel Cormier':'DC',
  'Brock Lesnar':'The Beast','Chuck Liddell':'The Iceman','Quinton Jackson':'Rampage','Jorge Masvidal':'Gamebred BMF','Kamaru Usman':'The Nigerian Nightmare',
  'Leon Edwards':'Rocky','Belal Muhammad':'Remember the Name','Valentina Shevchenko':'Bullet','Zhang Weili':'Magnum','Kayla Harrison':'The Judo Hammer',
  'Holly Holm':'The Preacher\'s Daughter','Julianna Pena':'The Venezuelan Vixen','Michael Chandler':'Iron','Colby Covington':'Chaos',
  'Michael Bisping':'The Count','Chael Sonnen':'The American Gangster','Tony Ferguson':'El Cucuy','Cris Cyborg':'Cyborg','Henry Cejudo':'Triple C',
  'Petr Yan':'No Mercy','Dricus du Plessis':'Stillknocks','Robert Whittaker':'The Reaper','Derrick Lewis':'The Black Beast',
  'Jose Aldo':'Junior Scarface','Randy Couture':'The Natural','Wanderlei Silva':'The Axe Murderer',
  'Dominick Cruz':'The Dominator','Demetrious Johnson':'Mighty Mouse','Jiri Prochazka':'BJP',
  'Shavkat Rakhmonov':'Nomad','Ian Machado Garry':'The Future','Bryce Mitchell':'Thug Nasty',
  'Brandon Moreno':'The Assassin Baby','Alexandre Pantoja':'The Cannibal','Rose Namajunas':'Thug Rose',
  'BJ Penn':'The Prodigy',
  'Mark Hunt':'The Super Samoan','Kimbo Slice':'Kimbo','Junior dos Santos':'Cigano','Mauricio Rua':'Shogun','Lyoto Machida':'The Dragon',
  'Vitor Belfort':'The Phenom','Dan Henderson':'Hendo','Yoel Romero':'The Soldier of God','Robbie Lawler':'Ruthless',
  'Carlos Condit':'The Natural Born Killer','Tyron Woodley':'The Chosen One','Johny Hendricks':'Bigg Rigg','Tito Ortiz':'The Huntington Beach Bad Boy',
  'Ken Shamrock':'The World\'s Most Dangerous Man','Alexander Gustafsson':'The Mauler',
  'Jan Blachowicz':'Polish Power','Jamahal Hill':'Sweet Dreams','Frankie Edgar':'The Answer','Benson Henderson':'Smooth','Eddie Alvarez':'The Underground King',
  'Rafael dos Anjos':'RDA','Brian Ortega':'T-City','Yair Rodriguez':'El Pantera','T.J. Dillashaw':'Viper','Aljamain Sterling':'Funk Master',
  'Urijah Faber':'The California Kid','Cory Sandhagen':'Sandman','Miesha Tate':'Cupcake','Mark Coleman':'The Hammer',
  'Dan Severn':'The Beast','Arman Tsarukyan':'Ahalkalakets','Dan Hooker':'The Hangman',
  'Gilbert Burns':'Durinho','Geoff Neal':'Handz of Steel','Stephen Thompson':'Wonderboy','Michael Page':'MVP','Kevin Holland':'Trailblazer',
  'Neil Magny':'The Haitian Sensation','Vicente Luque':'The Silent Assassin','Curtis Blaydes':'Razor','Alexander Volkov':'Drago',
  'Tai Tuivasa':'Bam Bam','Jared Cannonier':'The Killa Gorilla','Marvin Vettori':'The Italian Dream','Kelvin Gastelum':'The Ultimate Fighter','Paulo Costa':'The Eraser',
  'Jack Della Maddalena':'JDM','Cody Garbrandt':'No Love','Rob Font':'Ruthless','Donald Cerrone':'Cowboy','Jim Miller':'A-10','Clay Guida':'The Carpenter',
  'Josh Emmett':'The Throwback','Calvin Kattar':'The Boston Finisher','Chan Sung Jung':'The Korean Zombie','Giga Chikadze':'Ninja','Gina Carano':'Conviction',
  'Paige VanZant':'12 Gauge','Mackenzie Dern':'Super Mac','Tatiana Suarez':'Tatiana','Raquel Pennington':'Rocky','Cat Zingano':'Alpha Kitty','Marlon Moraes':'Magic',
  'Gregor Gillespie':'The Gift','Mateusz Gamrot':'Gamer','Kai Kara-France':'Don\'t Blink','Brandon Royval':'Raw Dog','Josh Barnett':'The Warmaster','Andrei Arlovski':'The Pitbull'
};

// More current fighters (ranked top 15 or champion, Oct 2026) so people can favorite them.
(window.UFC_FIGHTERS=window.UFC_FIGHTERS||[]).push(["Rizvan Kuniev","Heavyweight"],["Josh Hokit","Heavyweight"],["Vitor Petrino","Heavyweight"],["Mario Pinto","Heavyweight"],["Valter Walker","Heavyweight"],["Brando Pericic","Heavyweight"],["Aleksandar Rakic","Heavyweight"],["Navajo Stirling","Light Heavyweight"],["Azamat Murzakanov","Light Heavyweight"],["Alonzo Menifield","Light Heavyweight"],["Bogdan Guskov","Light Heavyweight"],["Muhammad Saidov","Light Heavyweight"],["Joe Pyfer","Middleweight"],["Gregory Rodrigues","Middleweight"],["Anthony Hernandez","Middleweight"],["Christian Leroy Duncan","Middleweight"],["Abusupiyan Magomedov","Middleweight"],["Edmen Shahbazyan","Middleweight"],["Michael Morales","Welterweight"],["Gabriel Bonfim","Welterweight"],["Uros Medic","Welterweight"],["Mike Malott","Welterweight"],["Yaroslav Amosov","Welterweight"],["Quillan Salkilld","Lightweight"],["Benoit Saint Denis","Lightweight"],["Tom Nolan","Lightweight"],["Tofiq Musayev","Lightweight"],["Pat Sabatini","Featherweight"],["Pavel Andrusca","Featherweight"],["Youssef Zalal","Featherweight"],["Kevin Vallejos","Featherweight"],["Joanderson Brito","Featherweight"],["Melquizael Costa","Featherweight"],["Steve Garcia","Featherweight"],["Aaron Pico","Featherweight"],["Jamall Emmers","Featherweight"],["David Martinez","Bantamweight"],["Raul Rosas Jr.","Bantamweight"],["Farid Basharat","Bantamweight"],["Marcus McGhee","Bantamweight"],["Montel Jackson","Bantamweight"],["Aiemann Zahabi","Bantamweight"],["Asu Almabayev","Flyweight"],["Lone'er Kavanagh","Flyweight"],["Ramazan Temirov","Flyweight"],["Kyoji Horiguchi","Flyweight"],["Su Mudaerji","Flyweight"],["Mitch Raposo","Flyweight"],["Rei Tsuruya","Flyweight"],["Charles Johnson","Flyweight"],["Alessandro Costa","Flyweight"],["Wang Cong","Women's Flyweight"],["Jasmine Jasudavicius","Women's Flyweight"],["Tracy Cortez","Women's Flyweight"],["Casey O'Neill","Women's Flyweight"],["Miranda Maverick","Women's Flyweight"],["Regina Tarin","Women's Flyweight"],["Karine Silva","Women's Flyweight"],["Carli Judice","Women's Flyweight"],["Fatima Kline","Women's Strawweight"],["Alexia Thainara","Women's Strawweight"],["Piera Rodriguez","Women's Strawweight"],["Denise Gomes","Women's Strawweight"],["Mizuki Inoue","Women's Strawweight"],["Tabatha Ricci","Women's Strawweight"],["Jaqueline Amorim","Women's Strawweight"],["Amanda Lemos","Women's Strawweight"],["Talita Alencar","Women's Strawweight"],["Joselyne Edwards","Women's Bantamweight"],["Ailin Perez","Women's Bantamweight"],["Luana Santos","Women's Bantamweight"],["Yana Santos","Women's Bantamweight"],["Jacqueline Cavalcanti","Women's Bantamweight"],["Michelle Montague","Women's Bantamweight"],["Melissa Croden","Women's Bantamweight"],["Karol Rosa","Women's Bantamweight"],["Beatriz Mesquita","Women's Bantamweight"],["Nora Cornolle","Women's Bantamweight"],["Darya Zheleznyakova","Women's Bantamweight"]);
