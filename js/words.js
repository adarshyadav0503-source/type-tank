// TYPE//TANK - Word Dictionaries & Exclusion Manager
const WORDS = {
  mode1: [
    'tank','radar','fire','scan','lock','aim','run','hit','gun','bay',
    'armor','shell','blast','turret','scope','flank','creek','delta','echo','foxtrot',
    'alpha','bravo','charlie','signal','recon','advance','cover','deploy','engage','flare',
    'sector','patrol','breach','clear','storm','rally','surge','drive','hold','push',
    'front','guard','line','base','squad','lance','siege','zone','march','salvo',
    'sniper','bunker','trench','mortar','volley','strike','intel','ghost','forge','anvil',
    'viper','cobra','eagle','hawk','raven','wolf','tiger','lion','bear','shark',
    'thunder','lightning','shadow','phantom','specter','wraith','cipher','vector','nexus','apex',
    'blaze','crypt','depot','ember','fury','gaze','havoc','iron','jolt','keen',
    'nova','orbit','pivot','quake','rivet','saber','thorn','ultra','yield','zeal',
    'arrow','blade','crane','drift','epoch','fable','glare','hedge','inlet','jewel'
  ],
  mode2: [
    'Tank','Radar','Alpha','Bravo','Delta','Echo','Foxtrot','Ghost','Hawk','Iron',
    'ALPHA','BRAVO','DELTA','ECHO','FOXTROT','TANGO','SIERRA','OMEGA','VICTOR','ZULU',
    'RadarX','TankA','HawkEye','IronFist','DeltaForce','AlphaTeam','BravoUnit','FireBase',
    'LockDown','ScanLine','TurretA','ScopeB','FlankC','SignalE','ReconF','AdvanceG',
    'CoverH','DeployI','EngageJ','FlareK','SectorL','PatrolM','BreachN','ClearO',
    'StormP','RallyQ','SurgeR','DriveS','HoldT','PushU','FrontV','GuardW',
    'SquadZ','ViperX','CobraY','EagleZ','ThunderA','LightningB','ShadowC','PhantomD',
    'SpecterE','WraithF','CipherG','VectorH','NexusI','ApexJ','ForgeK','BlazeL',
    'CryptM','DepotN','EmberO','FuryP','GazeQ','HavocR','JoltS','KeenT','LanceU'
  ],
  mode3: [
    'Tank99','Radar7','Alpha5','Bravo9','Delta4','Echo3','Foxtrot2','Ghost1','Hawk6','Iron8',
    'Squad5','Unit7','Base9','Zone3','Line4','Sect2','Flank8','Turret6','Cannon9','Shell7',
    'v2.0','v3.1','v4.5','x86','x64','AK47','M16','M4A1','AR15','HK45',
    'F16','F22','F35','B52','B2A','C130','C17A','V22B','MH60','UH1Y',
    'Alpha01','Bravo02','Charlie03','Delta04','Echo05','Foxtrot06','Golf07','Hotel08',
    'T72','T80','T90','M1A2','M60A3','Leopard2','Abrams7','Challenger3','Merkava4',
    'P3Recon','L4Snipe','K9Storm','J7Flank','H6Surge','G5Drive','F4Hold','E3Push',
    'Node1','Port80','Port443','Byte64','Bit32','Hex0F','Hex1A','Dec255','Oct77','Bin101',
    'Blaze3','Crypt7','Depot9','Ember4','Fury6','Havoc2','Jolt5','Keen8','Nova1','Orbit3'
  ],
  mode4: [
    '[tank-01]','(8+9)','{cmd-9}','!alert!','[radar-x]','(fire+aim)','!deploy!','{lock-9}',
    '[alpha-01]','[bravo-02]','[charlie-3]','[delta-4]','!engage!','!breach!','!storm!','!rally!',
    '(3*9)','(7+4)','(12-5)','(8/2)','(6^2)','(sqrt9)','(pi*r)','(e=mc2)',
    '{sys-cmd}','{net-cfg}','{usr-mgr}','{dev-ops}','{sec-key}','{api-v2}','{tcp-80}','{udp-53}',
    '!fire!','!scan!','!lock!','!aim!','!run!','!hit!','!flare!','!siege!',
    '[M1A2]','[F-16]','[B-52]','[AK-47]','[M-16]','[HK-45]','[AR-15]','[C-130]',
    '(tank+armor)','(radar+scope)','(turret*2)','(cannon/3)','(shell^2)',
    '{ghost-ops}','{phantom-9}','{wraith-x}','{cipher-7}','{vector-3}',
    '!ALPHA!','!BRAVO!','!DELTA!','!ECHO!','!FOXTROT!','!TANGO!','!SIERRA!',
    '[v2.0-beta]','[x86-64]','[node-v18]','[port-443]','[hex-0xFF]',
    '{blaze-3}','{crypt-7}','[depot-9]','!ember!','(fury*6)','[havoc-2]','!jolt!',
    '(nova+1)','[orbit-3]','!pivot!','{quake-9}','[rivet-4]','!saber!','{thorn-7}'
  ]
};

const ExclusionManager = {
  excluded: new Map(),
  cooldownMs: 3000,
  exclude(char) { this.excluded.set(char.toLowerCase(), Date.now() + this.cooldownMs); },
  isExcluded(char) {
    const exp = this.excluded.get(char.toLowerCase());
    if (!exp) return false;
    if (Date.now() > exp) { this.excluded.delete(char.toLowerCase()); return false; }
    return true;
  },
  clear() { this.excluded.clear(); }
};

const RedSuppression = {
  active: new Set(),
  suppress(char) { this.active.add(char.toLowerCase()); },
  release(char) { this.active.delete(char.toLowerCase()); ExclusionManager.exclude(char); },
  isSuppressed(char) { return this.active.has(char.toLowerCase()); },
  clear() { this.active.clear(); }
};

function getWordList(mode) {
  switch (mode) {
    case 1: return WORDS.mode1;
    case 2: return [...WORDS.mode1, ...WORDS.mode2];
    case 3: return [...WORDS.mode1, ...WORDS.mode2, ...WORDS.mode3];
    case 4: return [...WORDS.mode1, ...WORDS.mode2, ...WORDS.mode3, ...WORDS.mode4];
    default: return WORDS.mode1;
  }
}

function getRandomWord(mode, excludeStartChars) {
  excludeStartChars = excludeStartChars || [];
  const list = getWordList(mode);
  const filtered = list.filter(function(w) {
    const ch = w[0].toLowerCase();
    return excludeStartChars.indexOf(ch) === -1 && !RedSuppression.isSuppressed(ch) && !ExclusionManager.isExcluded(ch);
  });
  if (filtered.length === 0) return list[Math.floor(Math.random() * list.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function getRedBonusWord(mode) {
  const list = getWordList(mode);
  return list[Math.floor(Math.random() * list.length)];
}
