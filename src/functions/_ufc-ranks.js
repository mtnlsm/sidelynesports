// Backup UFC champions + divisional rankings (top 15). Used by sports-data.js ONLY when ESPN's rankings feed is down or has no champion marks.
// Snapshot taken Oct 10, 2026 (rankings as of ~Oct 3, after UFC 332). Update it after big events: champion first, then #1, #2, ... in order.
// A fighter listed twice keeps the FIRST spot, so divisions are ordered so the division they are actually fighting in comes first.
const DIVS = [
  ['Heavyweight', 'Ciryl Gane', ['Tom Aspinall', 'Sergei Pavlovich', 'Alex Pereira', 'Alexander Volkov', 'Rizvan Kuniev', 'Josh Hokit', 'Curtis Blaydes', 'Waldo Cortes-Acosta', 'Vitor Petrino', 'Mario Pinto', 'Valter Walker', 'Brando Pericic', 'Serghei Spivac', 'Shamil Gaziev', 'Aleksandar Rakic']],
  ['Light Heavyweight', 'Carlos Ulberg', ['Alex Pereira', 'Magomed Ankalaev', 'Jiri Prochazka', 'Paulo Costa', 'Jamahal Hill', 'Khalil Rountree Jr.', 'Navajo Stirling', 'Dominick Reyes', 'Reinier de Ridder', 'Azamat Murzakanov', 'Alonzo Menifield', 'Bogdan Guskov', 'Robert Whittaker', 'Johnny Walker', 'Muhammad Saidov']],
  ['Middleweight', 'Sean Strickland', ['Khamzat Chimaev', 'Dricus du Plessis', 'Nassourdine Imavov', 'Joe Pyfer', 'Brendan Allen', 'Caio Borralho', 'Gregory Rodrigues', 'Anthony Hernandez', 'Israel Adesanya', 'Christian Leroy Duncan', 'Ikram Aliskerov', 'Bo Nickal', 'Abusupiyan Magomedov', 'Edmen Shahbazyan', 'Jared Cannonier']],
  ['Welterweight', 'Islam Makhachev', ['Carlos Prates', 'Ian Machado Garry', 'Michael Morales', 'Jack Della Maddalena', 'Sean Brady', 'Gabriel Bonfim', 'Belal Muhammad', 'Joaquin Buckley', 'Uros Medic', 'Leon Edwards', 'Mike Malott', 'Kamaru Usman', 'Yaroslav Amosov', 'Kevin Holland', 'Daniel Rodriguez']],
  ['Lightweight', 'Justin Gaethje', ['Ilia Topuria', 'Arman Tsarukyan', 'Charles Oliveira', 'Max Holloway', 'Paddy Pimblett', 'Quillan Salkilld', 'Benoit Saint Denis', 'Renato Moicano', 'Mateusz Gamrot', 'Mauricio Ruffy', 'Tom Nolan', 'Rafael Fiziev', 'Tofiq Musayev', 'Grant Dawson', 'Jalin Turner']],
  ['Featherweight', 'Alexander Volkanovski', ['Movsar Evloev', 'Diego Lopes', 'Lerone Murphy', 'Aljamain Sterling', 'Jean Silva', 'Arnold Allen', 'Pat Sabatini', 'Pavel Andrusca', 'Youssef Zalal', 'Kevin Vallejos', 'Joanderson Brito', 'Melquizael Costa', 'Steve Garcia', 'Aaron Pico', 'Jamall Emmers']],
  ['Bantamweight', 'Petr Yan', ['Merab Dvalishvili', 'Song Yadong', "Sean O'Malley", 'Mario Bautista', 'Umar Nurmagomedov', 'Cory Sandhagen', 'David Martinez', 'Raul Rosas Jr.', 'Farid Basharat', 'Marcus McGhee', 'Deiveson Figueiredo', 'Montel Jackson', 'Aiemann Zahabi', 'Marlon Vera', 'Bryce Mitchell']],
  ['Flyweight', 'Joshua Van', ['Alexandre Pantoja', 'Manel Kape', 'Brandon Royval', 'Tatsuro Taira', 'Asu Almabayev', "Lone'er Kavanagh", 'Ramazan Temirov', 'Kyoji Horiguchi', 'Brandon Moreno', 'Amir Albazi', 'Su Mudaerji', 'Mitch Raposo', 'Rei Tsuruya', 'Charles Johnson', 'Alessandro Costa']],
  ["Women's Flyweight", 'Natalia Silva', ['Alexa Grasso', 'Erin Blanchfield', 'Manon Fiorot', 'Zhang Weili', 'Wang Cong', 'Jasmine Jasudavicius', 'Rose Namajunas', 'Maycee Barber', 'Tracy Cortez', "Casey O'Neill", 'Miranda Maverick', 'Regina Tarin', 'Karine Silva', 'Carli Judice']],
  ["Women's Strawweight", 'Mackenzie Dern', ['Zhang Weili', 'Virna Jandiroba', 'Tatiana Suarez', 'Yan Xiaonan', 'Gillian Robertson', 'Fatima Kline', 'Alexia Thainara', 'Piera Rodriguez', 'Denise Gomes', 'Mizuki Inoue', 'Loopy Godinez', 'Tabatha Ricci', 'Jaqueline Amorim', 'Amanda Lemos', 'Talita Alencar']],
  ["Women's Bantamweight", 'Kayla Harrison', ['Joselyne Edwards', 'Ailin Perez', 'Norma Dumont', 'Luana Santos', 'Julianna Pena', 'Yana Santos', 'Jacqueline Cavalcanti', 'Michelle Montague', 'Melissa Croden', 'Karol Rosa', 'Beatriz Mesquita', 'Nora Cornolle', 'Macy Chiasson', 'Darya Zheleznyakova', 'Raquel Pennington']],
];
// same fighter, other name order / spelling that ESPN uses
const ALIAS = { 'Zhang Weili': ['Weili Zhang'], 'Wang Cong': ['Cong Wang'], 'Yan Xiaonan': ['Xiaonan Yan'], 'Song Yadong': ['Yadong Song'], 'Beatriz Mesquita': ['Bia Mesquita'] };
const nkey = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const map = {};
const put = (name, v) => { for (const n of [name].concat(ALIAS[name] || [])) { const k = nkey(n); if (!(k in map)) map[k] = v; } };
for (const [, champ, list] of DIVS) { put(champ, 'C'); list.forEach((n, i) => put(n, i + 1)); }
module.exports = { map, updated: '2026-10-10' };
