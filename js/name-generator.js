/**
 * Fantasy Name Generator Engine
 * Universal module used by all race-specific landing pages.
 *
 * Usage:
 *   initNameGenerator({ race: 'elf', mountTo: '#generator-mount' });
 */
function initNameGenerator(opts) {
    var race = opts.race || 'human';
    var mountTo = opts.mountTo || '#generator-mount';
    var container = document.querySelector(mountTo);
    if (!container) return;

    // ============================================================
    // Syllable tables per race, with gender variants
    // ============================================================
    var phonemes = {
        human: {
            male: {
                prefixes: ['Ald', 'Bran', 'Ced', 'Dor', 'Ed', 'Gar', 'Hal', 'Kor', 'Lor', 'Mar', 'Nor', 'Rod', 'Sten', 'Thr', 'War', 'Wyn', 'Bal', 'Cad', 'Fen', 'Gal'],
                middles: ['ri', 'an', 'or', 'en', 'al', 'ar', 'el', 'on', 'is', 'as', 'in', 'ul', 'em', 'at', 'os'],
                suffixes: ['ic', 'ard', 'mund', 'ric', 'dan', 'win', 'ton', 'wald', 'bert', 'dric', 'gar', 'ren', 'ston', 'vyn', 'der']
            },
            female: {
                prefixes: ['Ael', 'Bri', 'Cat', 'Del', 'El', 'Fay', 'Gwen', 'Hel', 'Isa', 'Lyn', 'Mara', 'Ros', 'Syl', 'Tes', 'Val', 'Wil', 'Ari', 'Cel', 'Ev', 'Lil'],
                middles: ['ia', 'an', 'el', 'en', 'ar', 'ina', 'ora', 'yl', 'ith', 'al', 'is', 'ea', 'on', 'ada', 'ira'],
                suffixes: ['na', 'ra', 'wen', 'ith', 'ine', 'lia', 'da', 'beth', 'elle', 'isa', 'ette', 'lyn', 'dra', 'ria', 'la']
            },
            neutral: {
                prefixes: ['Ash', 'Blair', 'Cal', 'Dael', 'Elm', 'Finn', 'Glen', 'Hart', 'Kael', 'Lar', 'Mor', 'Penn', 'Quin', 'Ren', 'Sage', 'Tarn', 'Vael', 'Wren', 'Zan', 'Roan'],
                middles: ['an', 'en', 'ar', 'el', 'in', 'on', 'al', 'ir', 'or', 'yn', 'is', 'as', 'em', 'ul', 'ey'],
                suffixes: ['ley', 'rin', 'ven', 'den', 'ton', 'wyn', 'mar', 'dale', 'ston', 'brook', 'lan', 'sey', 'ford', 'well', 'mere']
            }
        },
        elf: {
            male: {
                prefixes: ['Ael', 'Cael', 'Eil', 'Fael', 'Gal', 'Ith', 'Lae', 'Nael', 'Quel', 'Sil', 'Thal', 'Vael', 'Ael', 'Ath', 'Cel', 'Elr', 'Fae', 'Lor', 'Mae', 'Rael'],
                middles: ['an', 'ith', 'ae', 'or', 'el', 'ar', 'ion', 'ael', 'oth', 'en', 'il', 'iel', 'ath', 'uen', 'ial'],
                suffixes: ['dor', 'ion', 'iel', 'orn', 'ith', 'ael', 'las', 'oth', 'wen', 'mir', 'ros', 'dal', 'nar', 'thir', 'vin']
            },
            female: {
                prefixes: ['Ael', 'Ara', 'Cel', 'Ela', 'Fae', 'Gal', 'Ila', 'Lae', 'Miel', 'Nae', 'Sae', 'Thi', 'Val', 'Yae', 'Ari', 'Bri', 'Eil', 'Lir', 'Nyl', 'Rae'],
                middles: ['ae', 'iel', 'ith', 'ana', 'eli', 'ara', 'wen', 'il', 'ea', 'ori', 'ala', 'ira', 'ael', 'enna', 'yl'],
                suffixes: ['iel', 'wen', 'ara', 'ith', 'ael', 'ira', 'nia', 'ella', 'ora', 'ala', 'iel', 'thea', 'lia', 'dae', 'rae']
            },
            neutral: {
                prefixes: ['Ael', 'Cel', 'Eil', 'Fael', 'Gael', 'Il', 'Kael', 'Lael', 'Mael', 'Nael', 'Rael', 'Sael', 'Thael', 'Vael', 'Ael', 'Bael', 'Dael', 'Hael', 'Jael', 'Pael'],
                middles: ['ae', 'el', 'ith', 'an', 'il', 'en', 'ar', 'iel', 'oth', 'yn', 'al', 'or', 'wen', 'ir', 'ael'],
                suffixes: ['yn', 'iel', 'ith', 'ael', 'wen', 'ar', 'or', 'en', 'il', 'is', 'el', 'an', 'ir', 'al', 'on']
            }
        },
        dwarf: {
            male: {
                prefixes: ['Bor', 'Dur', 'Grim', 'Thor', 'Krag', 'Brul', 'Dun', 'Grom', 'Hald', 'Khor', 'Mur', 'Nor', 'Rag', 'Skor', 'Thur', 'Ulf', 'Bram', 'Drak', 'Gund', 'Kol'],
                middles: ['ag', 'un', 'or', 'in', 'ar', 'ok', 'ur', 'ak', 'an', 'ol', 'ir', 'um', 'ek', 'al', 'om'],
                suffixes: ['din', 'dur', 'grim', 'gar', 'mund', 'rik', 'bor', 'dok', 'nak', 'thur', 'gran', 'mir', 'dak', 'rok', 'vir']
            },
            female: {
                prefixes: ['Bel', 'Dra', 'Ger', 'Hild', 'Kel', 'Brun', 'Dis', 'Fre', 'Gur', 'Hel', 'Ing', 'Kat', 'Mor', 'Rud', 'Sig', 'Thra', 'Und', 'Val', 'Yen', 'Agna'],
                middles: ['ra', 'da', 'na', 'ri', 'ga', 'ma', 'la', 'ka', 'va', 'ta', 'sa', 'ba', 'pa', 'ja', 'ha'],
                suffixes: ['dis', 'hild', 'run', 'lin', 'ga', 'dra', 'gret', 'bra', 'stra', 'mir', 'mund', 'rin', 'vig', 'bel', 'fra']
            },
            neutral: {
                prefixes: ['Brak', 'Dur', 'Gron', 'Khor', 'Mur', 'Nor', 'Skar', 'Thorn', 'Ur', 'Brim', 'Durn', 'Gald', 'Kran', 'Mol', 'Orn', 'Stur', 'Thrum', 'Vak', 'Wur', 'Zan'],
                middles: ['ak', 'un', 'or', 'an', 'ir', 'ar', 'ok', 'ur', 'en', 'al', 'im', 'om', 'ek', 'ul', 'ag'],
                suffixes: ['ek', 'un', 'ir', 'ak', 'or', 'al', 'in', 'ur', 'an', 'ok', 'ar', 'em', 'ik', 'ol', 'um']
            }
        },
        orc: {
            male: {
                prefixes: ['Grok', 'Mug', 'Thrak', 'Urg', 'Zak', 'Brug', 'Durg', 'Gash', 'Krug', 'Lurg', 'Morg', 'Nak', 'Prog', 'Skar', 'Tusk', 'Vrag', 'Warg', 'Yag', 'Brak', 'Gur'],
                middles: ['uk', 'ak', 'or', 'ag', 'ug', 'ur', 'ok', 'ar', 'az', 'og', 'ul', 'ek', 'ash', 'usk', 'urg'],
                suffixes: ['gul', 'nak', 'gor', 'tusk', 'mak', 'rok', 'dak', 'bash', 'gak', 'zar', 'gash', 'rak', 'mog', 'bur', 'thak']
            },
            female: {
                prefixes: ['Gra', 'Mur', 'Sha', 'Ura', 'Zul', 'Bra', 'Dra', 'Gor', 'Kra', 'Lur', 'Mor', 'Nar', 'Ska', 'Thr', 'Vra', 'Yur', 'Ag', 'Esh', 'Hak', 'Olk'],
                middles: ['a', 'u', 'o', 'ak', 'ash', 'ag', 'uk', 'ur', 'az', 'ug', 'ok', 'ar', 'ek', 'ol', 'ul'],
                suffixes: ['ra', 'sha', 'ga', 'ka', 'la', 'na', 'gra', 'zha', 'ba', 'da', 'tha', 'gha', 'va', 'ma', 'ta']
            },
            neutral: {
                prefixes: ['Grak', 'Murg', 'Snak', 'Thrug', 'Vrak', 'Zug', 'Brok', 'Durg', 'Gush', 'Krak', 'Lug', 'Nurg', 'Prag', 'Skur', 'Trag', 'Urg', 'Wurg', 'Yak', 'Brug', 'Gurg'],
                middles: ['ak', 'uk', 'ok', 'ag', 'ug', 'ur', 'ar', 'az', 'or', 'og', 'ek', 'ul', 'ash', 'usk', 'urg'],
                suffixes: ['ak', 'uk', 'og', 'ur', 'az', 'ok', 'ug', 'ar', 'ek', 'or', 'ag', 'ul', 'ash', 'usk', 'urg']
            }
        },
        dragon: {
            male: {
                prefixes: ['Aldra', 'Bael', 'Draeg', 'Fyr', 'Kael', 'Malth', 'Rhaeg', 'Shar', 'Thar', 'Vyr', 'Xar', 'Zael', 'Aeth', 'Cor', 'Dray', 'Ghael', 'Ixen', 'Naer', 'Pyr', 'Saeth'],
                middles: ['ax', 'ion', 'yr', 'oth', 'aer', 'ix', 'ael', 'or', 'ath', 'yx', 'en', 'ar', 'iel', 'az', 'ur'],
                suffixes: ['rion', 'xes', 'thos', 'gon', 'maer', 'zyr', 'dax', 'rax', 'phyr', 'thax', 'gonn', 'rys', 'myx', 'nox', 'vyre']
            },
            female: {
                prefixes: ['Aer', 'Bael', 'Cyr', 'Drae', 'Fael', 'Gyr', 'Ixia', 'Lyra', 'Myra', 'Naer', 'Pyra', 'Rhae', 'Syr', 'Tael', 'Vyr', 'Xae', 'Yrae', 'Zael', 'Ael', 'Eira'],
                middles: ['ae', 'yr', 'ia', 'ix', 'ael', 'ara', 'ira', 'yra', 'ath', 'yx', 'ori', 'ena', 'iel', 'ala', 'ira'],
                suffixes: ['rys', 'xia', 'thea', 'phia', 'myra', 'zyra', 'naia', 'vyre', 'rae', 'dria', 'sya', 'ryth', 'xara', 'phyra', 'nyx']
            },
            neutral: {
                prefixes: ['Aer', 'Byr', 'Cyx', 'Drax', 'Eir', 'Fyx', 'Gyr', 'Ixr', 'Kyx', 'Lyr', 'Myx', 'Nyr', 'Pyx', 'Ryx', 'Syr', 'Tyx', 'Vyr', 'Wyx', 'Xyr', 'Zyx'],
                middles: ['ax', 'yr', 'ix', 'oth', 'ae', 'yx', 'ar', 'en', 'or', 'ath', 'el', 'az', 'ir', 'on', 'iel'],
                suffixes: ['ryx', 'xon', 'thar', 'gyr', 'max', 'zyn', 'dor', 'rax', 'phyn', 'thax', 'gon', 'ryn', 'myx', 'nox', 'vyr']
            }
        },
        demon: {
            male: {
                prefixes: ['Azr', 'Bael', 'Char', 'Draz', 'Graz', 'Kal', 'Mal', 'Naz', 'Raz', 'Xul', 'Zar', 'Bal', 'Dae', 'Ghe', 'Khor', 'Mor', 'Nyx', 'Shaz', 'Thar', 'Vor'],
                middles: ['az', 'ul', 'or', 'oth', 'ak', 'ix', 'ez', 'ur', 'ael', 'ar', 'os', 'en', 'yx', 'ash', 'ek'],
                suffixes: ['moth', 'zul', 'rath', 'goth', 'phon', 'rax', 'deus', 'zel', 'bith', 'kesh', 'mael', 'noth', 'roth', 'xar', 'zur']
            },
            female: {
                prefixes: ['Aly', 'Bel', 'Cyr', 'Dae', 'Ghe', 'Lil', 'Mal', 'Nyx', 'Sar', 'Vel', 'Xen', 'Zar', 'Ash', 'Dra', 'Kal', 'Mor', 'Pha', 'She', 'Thr', 'Ves'],
                middles: ['az', 'ix', 'oth', 'ae', 'yr', 'ael', 'ul', 'en', 'ar', 'yx', 'ora', 'ira', 'ala', 'iel', 'ash'],
                suffixes: ['ith', 'ira', 'eya', 'otha', 'yxia', 'ael', 'mora', 'neya', 'risa', 'thea', 'zia', 'phra', 'kia', 'sha', 'vael']
            },
            neutral: {
                prefixes: ['Az', 'Byx', 'Char', 'Dyx', 'Ghoz', 'Kaz', 'Mox', 'Nyz', 'Raz', 'Shaz', 'Thoz', 'Vex', 'Xaz', 'Zyx', 'Baz', 'Dryz', 'Ghex', 'Kyx', 'Phaz', 'Syx'],
                middles: ['az', 'ix', 'oth', 'ul', 'yx', 'ar', 'ez', 'ok', 'ur', 'ek', 'ash', 'oz', 'ak', 'en', 'or'],
                suffixes: ['oth', 'zul', 'rax', 'kyn', 'mez', 'xar', 'nyz', 'phor', 'gez', 'thoz', 'byx', 'zel', 'dor', 'shyn', 'vox']
            }
        },
        celestial: {
            male: {
                prefixes: ['Aur', 'Cel', 'Div', 'Eli', 'Gab', 'Hal', 'Ith', 'Kal', 'Lum', 'Mik', 'Nath', 'Ori', 'Raph', 'Ser', 'Tyr', 'Uri', 'Zeph', 'Astr', 'Sol', 'Lux'],
                middles: ['ae', 'iel', 'an', 'el', 'ith', 'ar', 'ion', 'ael', 'en', 'al', 'or', 'ir', 'il', 'oth', 'us'],
                suffixes: ['iel', 'ael', 'ion', 'ius', 'ael', 'oth', 'ren', 'mir', 'nar', 'diel', 'rael', 'phon', 'kiel', 'thel', 'ven']
            },
            female: {
                prefixes: ['Aur', 'Cel', 'Div', 'Eli', 'Gal', 'Hel', 'Iri', 'Kal', 'Lum', 'Mir', 'Nae', 'Ori', 'Rae', 'Ser', 'Tha', 'Uri', 'Zeph', 'Astr', 'Sol', 'Lux'],
                middles: ['ae', 'iel', 'ia', 'el', 'ith', 'ara', 'iel', 'ael', 'ena', 'ala', 'ora', 'ira', 'ila', 'ael', 'ea'],
                suffixes: ['iel', 'ael', 'ia', 'ira', 'aia', 'ella', 'ina', 'thea', 'riel', 'naia', 'phia', 'iel', 'aria', 'lia', 'mira']
            },
            neutral: {
                prefixes: ['Aur', 'Cel', 'Div', 'Eir', 'Gal', 'Hael', 'Ith', 'Kal', 'Lum', 'Mir', 'Nael', 'Ori', 'Rae', 'Sel', 'Thal', 'Uri', 'Zeph', 'Astr', 'Sol', 'Lux'],
                middles: ['ae', 'el', 'ith', 'an', 'il', 'en', 'ar', 'iel', 'al', 'or', 'ir', 'yn', 'em', 'on', 'ael'],
                suffixes: ['iel', 'ael', 'en', 'yn', 'or', 'ir', 'an', 'el', 'is', 'on', 'al', 'ien', 'iel', 'ar', 'em']
            }
        },
        goblin: {
            male: {
                prefixes: ['Bix', 'Crik', 'Drib', 'Fiz', 'Gnik', 'Jix', 'Krik', 'Miz', 'Nik', 'Pik', 'Riz', 'Skiz', 'Tik', 'Vix', 'Wik', 'Zik', 'Blib', 'Drik', 'Griz', 'Nib'],
                middles: ['ik', 'iz', 'ak', 'ik', 'uz', 'ek', 'az', 'ok', 'ib', 'ix', 'uk', 'ag', 'ob', 'ig', 'ub'],
                suffixes: ['nik', 'zik', 'bik', 'tok', 'rik', 'nak', 'dik', 'gok', 'pik', 'mik', 'snik', 'tik', 'wik', 'fiz', 'zap']
            },
            female: {
                prefixes: ['Bix', 'Cri', 'Dri', 'Fiz', 'Gi', 'Ji', 'Kri', 'Mi', 'Ni', 'Pi', 'Ri', 'Si', 'Ti', 'Vi', 'Wi', 'Zi', 'Bli', 'Dri', 'Gri', 'Ni'],
                middles: ['iz', 'ik', 'a', 'i', 'u', 'ik', 'iz', 'ak', 'ib', 'ix', 'ek', 'az', 'ok', 'ig', 'uk'],
                suffixes: ['ka', 'za', 'bi', 'ta', 'ri', 'na', 'di', 'ga', 'pi', 'mi', 'sni', 'ti', 'wi', 'fi', 'li']
            },
            neutral: {
                prefixes: ['Bix', 'Crik', 'Drib', 'Fiz', 'Gnik', 'Jix', 'Krik', 'Miz', 'Nik', 'Pik', 'Riz', 'Skiz', 'Tik', 'Vix', 'Wik', 'Zik', 'Blib', 'Drik', 'Griz', 'Snix'],
                middles: ['ik', 'iz', 'ak', 'uk', 'ez', 'ek', 'az', 'ok', 'ib', 'ix', 'ub', 'ag', 'ob', 'ig', 'uz'],
                suffixes: ['ik', 'iz', 'ak', 'ok', 'uz', 'ek', 'az', 'ub', 'ib', 'ix', 'uk', 'ag', 'ob', 'ig', 'ez']
            }
        }
    };

    // State
    var savedNames = [];
    var currentNames = [];

    // ============================================================
    // Build the UI
    // ============================================================
    container.innerHTML = '';

    // --- Controls ---
    var controls = document.createElement('div');
    controls.className = 'generator-controls';

    // Race selector
    var raceGroup = document.createElement('div');
    raceGroup.className = 'control-group';
    var raceLabel = document.createElement('label');
    raceLabel.textContent = 'Race / Style';
    raceLabel.setAttribute('for', 'race-select');
    var raceSelect = document.createElement('select');
    raceSelect.id = 'race-select';
    var raceOptions = [
        { value: 'human', label: 'Human' },
        { value: 'elf', label: 'Elf' },
        { value: 'dwarf', label: 'Dwarf' },
        { value: 'orc', label: 'Orc' },
        { value: 'dragon', label: 'Dragon' },
        { value: 'demon', label: 'Demon' },
        { value: 'celestial', label: 'Celestial' },
        { value: 'goblin', label: 'Goblin' }
    ];
    raceOptions.forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        if (o.value === race) opt.selected = true;
        raceSelect.appendChild(opt);
    });
    raceGroup.appendChild(raceLabel);
    raceGroup.appendChild(raceSelect);

    // Gender selector
    var genderGroup = document.createElement('div');
    genderGroup.className = 'control-group';
    var genderLabel = document.createElement('label');
    genderLabel.textContent = 'Gender';
    genderLabel.setAttribute('for', 'gender-select');
    var genderSelect = document.createElement('select');
    genderSelect.id = 'gender-select';
    [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'neutral', label: 'Neutral' }].forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        genderSelect.appendChild(opt);
    });
    genderGroup.appendChild(genderLabel);
    genderGroup.appendChild(genderSelect);

    // Count selector
    var countGroup = document.createElement('div');
    countGroup.className = 'control-group';
    var countLabel = document.createElement('label');
    countLabel.textContent = 'Count';
    countLabel.setAttribute('for', 'count-select');
    var countSelect = document.createElement('select');
    countSelect.id = 'count-select';
    [{ value: '1', label: '1' }, { value: '5', label: '5', selected: true }, { value: '10', label: '10' }, { value: '20', label: '20' }].forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        if (o.selected) opt.selected = true;
        countSelect.appendChild(opt);
    });
    countGroup.appendChild(countLabel);
    countGroup.appendChild(countSelect);

    controls.appendChild(raceGroup);
    controls.appendChild(genderGroup);
    controls.appendChild(countGroup);
    container.appendChild(controls);

    // --- Buttons ---
    var btnRow = document.createElement('div');
    btnRow.className = 'btn-row';

    var btnGenerate = document.createElement('button');
    btnGenerate.className = 'btn-generate';
    btnGenerate.textContent = 'Generate Names';

    var btnReroll = document.createElement('button');
    btnReroll.className = 'btn-reroll';
    btnReroll.textContent = 'Re-roll';

    var btnExport = document.createElement('button');
    btnExport.className = 'btn-export';
    btnExport.textContent = 'Export Saved List';

    btnRow.appendChild(btnGenerate);
    btnRow.appendChild(btnReroll);
    btnRow.appendChild(btnExport);
    container.appendChild(btnRow);

    // --- Names output ---
    var namesOutput = document.createElement('div');
    namesOutput.id = 'names-output';
    namesOutput.innerHTML = '<div class="empty-state"><p>No names generated yet</p><span>Select a race and click Generate Names to begin</span></div>';
    container.appendChild(namesOutput);

    // --- Click hint ---
    var clickHint = document.createElement('p');
    clickHint.className = 'click-hint';
    clickHint.style.display = 'none';
    clickHint.textContent = 'Click a name to copy it. Click the bookmark icon to save it to your list.';
    container.appendChild(clickHint);

    // --- Saved section ---
    var savedSection = document.createElement('div');
    savedSection.className = 'saved-section';

    var savedHeader = document.createElement('div');
    savedHeader.className = 'saved-header';
    var savedH3 = document.createElement('h3');
    savedH3.innerHTML = 'Saved Names <span class="count" id="saved-count">(0)</span>';
    savedHeader.appendChild(savedH3);
    savedSection.appendChild(savedHeader);

    var savedListEl = document.createElement('div');
    savedListEl.id = 'saved-list';
    savedListEl.innerHTML = '<span class="saved-empty">No saved names yet. Click the bookmark icon on a generated name to save it.</span>';
    savedSection.appendChild(savedListEl);
    container.appendChild(savedSection);

    var savedCountEl = savedH3.querySelector('.count');

    // ============================================================
    // Generation logic
    // ============================================================
    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function generateName(r, gender) {
        var table = phonemes[r][gender];
        var prefix = pick(table.prefixes);
        var useMid = Math.random() > 0.3;
        var middle = useMid ? pick(table.middles) : '';
        var suffix = pick(table.suffixes);
        var name = prefix + middle + suffix;
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        return name;
    }

    function generateBatch() {
        var r = raceSelect.value;
        var gender = genderSelect.value;
        var count = parseInt(countSelect.value);
        var names = new Set();
        var attempts = 0;
        while (names.size < count && attempts < count * 10) {
            names.add(generateName(r, gender));
            attempts++;
        }
        currentNames = Array.from(names);
        renderNames();
    }

    function renderNames() {
        if (currentNames.length === 0) {
            namesOutput.innerHTML = '<div class="empty-state"><p>No names generated yet</p><span>Select a race and click Generate Names to begin</span></div>';
            clickHint.style.display = 'none';
            return;
        }

        var grid = document.createElement('div');
        grid.className = 'names-grid';

        currentNames.forEach(function (name) {
            var card = document.createElement('div');
            card.className = 'name-card';
            card.textContent = name;

            var saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn' + (savedNames.indexOf(name) !== -1 ? ' saved' : '');
            saveBtn.innerHTML = savedNames.indexOf(name) !== -1 ? '&#9733;' : '&#9734;';
            saveBtn.title = 'Save to list';
            saveBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleSave(name, saveBtn);
            });

            card.appendChild(saveBtn);
            card.addEventListener('click', function () {
                copyName(name, card);
            });

            grid.appendChild(card);
        });

        namesOutput.innerHTML = '';
        namesOutput.appendChild(grid);
        clickHint.style.display = 'block';
    }

    function copyName(name, card) {
        navigator.clipboard.writeText(name).then(function () {
            card.classList.add('copied');
            setTimeout(function () {
                card.classList.remove('copied');
            }, 1200);
        }).catch(function () {
            var ta = document.createElement('textarea');
            ta.value = name;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            card.classList.add('copied');
            setTimeout(function () {
                card.classList.remove('copied');
            }, 1200);
        });
    }

    function toggleSave(name, btn) {
        var idx = savedNames.indexOf(name);
        if (idx === -1) {
            savedNames.push(name);
            btn.classList.add('saved');
            btn.innerHTML = '&#9733;';
        } else {
            savedNames.splice(idx, 1);
            btn.classList.remove('saved');
            btn.innerHTML = '&#9734;';
        }
        renderSavedList();
    }

    function renderSavedList() {
        savedCountEl.textContent = '(' + savedNames.length + ')';
        if (savedNames.length === 0) {
            savedListEl.innerHTML = '<span class="saved-empty">No saved names yet. Click the bookmark icon on a generated name to save it.</span>';
            return;
        }

        savedListEl.innerHTML = '';
        savedNames.forEach(function (name, i) {
            var tag = document.createElement('span');
            tag.className = 'saved-tag';
            tag.textContent = name;

            var removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', function () {
                savedNames.splice(i, 1);
                renderSavedList();
                renderNames();
            });

            tag.appendChild(removeBtn);
            savedListEl.appendChild(tag);
        });
    }

    function exportSavedList() {
        if (savedNames.length === 0) {
            alert('No saved names to export. Save some names first!');
            return;
        }
        var text = 'Fantasy Name Generator - Saved Names\n' +
            '=====================================\n\n' +
            savedNames.join('\n') + '\n';
        var blob = new Blob([text], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'fantasy-names.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Event listeners
    btnGenerate.addEventListener('click', generateBatch);
    btnReroll.addEventListener('click', generateBatch);
    btnExport.addEventListener('click', exportSavedList);
}
