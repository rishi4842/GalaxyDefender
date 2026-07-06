import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SHIP_WIDTH = 58;
const SHIP_HEIGHT = 50;
const SHIP_BOTTOM_OFFSET = 120;

const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 50;
const BOSS_WIDTH = 140;
const BOSS_HEIGHT = 100;
const BOSS_BASE_HP = 400;

const LASER_WIDTH = 6;
const LASER_HEIGHT = 20;
const LASER_SPEED = 18;

const ENEMY_BULLET_WIDTH = 6;
const ENEMY_BULLET_HEIGHT = 16;
const ENEMY_BULLET_SPEED = 7;

const POWERUP_SIZE = 34;
const COIN_SIZE = 20;
const EXPLOSION_SIZE = 60;

const SAVE_KEY = '@NeonWars_SaveData_v5';

const DEFAULT_UPGRADES = {
  engine: 1, laser: 1, fireRate: 1, coinBoost: 1,
  extraLife: 0, shieldUses: 0, rapidFireStart: 0, doubleDamageStart: 0, magnetStart: 0
};

const MISSIONS_POOL = [
  { id: 'm1', text: 'Destroy 50 enemies', type: 'KILLS', target: 50 },
  { id: 'm2', text: 'Reach Level 5', type: 'LEVEL', target: 5 },
  { id: 'm3', text: 'Score 2000 points', type: 'SCORE', target: 2000 },
  { id: 'm4', text: 'Defeat a Boss', type: 'BOSS', target: 1 },
  { id: 'm5', text: 'Collect 100 Coins', type: 'COINS', target: 100 },
  { id: 'm6', text: 'Survive for 2 minutes', type: 'TIME', target: 120 },
  { id: 'm7', text: 'Get a 10x Combo', type: 'COMBO', target: 10 },
  { id: 'm8', text: 'Collect 5 Power-ups', type: 'POWERUPS', target: 5 }
];

const ACHIEVEMENTS_LIST = [
  { id: 'a1', title: 'First Blood', desc: 'Kill 1 enemy', target: 1, type: 'KILLS' },
  { id: 'a2', title: 'Destroyer', desc: 'Kill 100 enemies', target: 100, type: 'KILLS' },
  { id: 'a3', title: 'Boss Slayer', desc: 'Kill 10 bosses', target: 10, type: 'BOSS' },
  { id: 'a4', title: 'Survivor', desc: 'Survive 5 minutes', target: 300, type: 'TIME' },
  { id: 'a5', title: 'Collector', desc: 'Collect 1000 coins', target: 1000, type: 'COINS' },
  { id: 'a6', title: 'Sharpshooter', desc: 'Score 5000 points', target: 5000, type: 'SCORE' },
];

const SHOP_ITEMS = [
  { id: 'extraLife', name: 'Extra Life ❤️', desc: '+1 Max Life', baseCost: 50, maxLevel: 5 },
  { id: 'shieldUses', name: 'Shield 🛡️', desc: 'Start with Shield', baseCost: 40, maxLevel: 3 },
  { id: 'rapidFireStart', name: 'Rapid Fire ⚡', desc: 'Start with Rapid Fire', baseCost: 60, maxLevel: 3 },
  { id: 'doubleDamageStart', name: 'Double Dmg 💥', desc: 'Start with 2x Dmg', baseCost: 80, maxLevel: 3 },
  { id: 'magnetStart', name: 'Magnet 🧲', desc: 'Start with Magnet', baseCost: 70, maxLevel: 3 },
  { id: 'coinBoost', name: 'Coin Booster 🪙', desc: 'Permanent 2x coins', baseCost: 150, maxLevel: 1 },
  { id: 'engine', name: 'Engine Boost 🚀', desc: 'Permanent +1 speed', baseCost: 30, maxLevel: 5 },
  { id: 'laser', name: 'Laser Boost 🔫', desc: 'Permanent +1 damage', baseCost: 40, maxLevel: 5 },
  { id: 'fireRate', name: 'Fire Rate Boost 🔥', desc: '-10% cooldown', baseCost: 35, maxLevel: 5 },
];

// ==========================================
// AUDIO PLACEHOLDERS
// ==========================================
const playShootSound = () => {};
const playExplosionSound = () => {};
const playBossSound = () => {};
const playCoinSound = () => {};
const playPowerupSound = () => {};
const playDamageSound = () => {};
const playClickSound = () => {};
const playLevelUpSound = () => {};

// ==========================================
// UTILS
// ==========================================
const rectIntersect = (r1, r2) => {
  return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
};

const getRandomMission = () => ({ ...MISSIONS_POOL[Math.floor(Math.random() * MISSIONS_POOL.length)], progress: 0 });

const generateStars = () => Array.from({ length: 60 }).map((_, i) => ({
  id: i.toString(),
  x: Math.random() * SCREEN_WIDTH,
  y: Math.random() * SCREEN_HEIGHT,
  size: Math.random() * 2.5 + 0.5,
  speed: Math.random() * 2.5 + 0.5,
  opacity: Math.random() * 0.8 + 0.2
}));

// ==========================================
// OPTIMIZED SUB-COMPONENTS
// ==========================================
const ParticleExplosion = React.memo(({ x, y, size }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] });
  const opacity = anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View style={[styles.explosionContainer, { left: x, top: y, width: size, height: size, opacity, transform: [{ scale }] }]}>
      <View style={[styles.explosionCore, { width: size, height: size, borderRadius: size / 2 }]} />
      <View style={[styles.explosionRing, { width: size * 1.5, height: size * 1.5, borderRadius: size * 0.75 }]} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Animated.View key={i} style={[styles.particle, { 
          transform: [
            { rotate: `${i * 45}deg` }, 
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -size] }) }
          ] 
        }]} />
      ))}
    </Animated.View>
  );
});

const FloatingText = React.memo(({ x, y, text, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const scale = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.2, 1] });

  return (
    <Animated.Text style={[styles.floatingText, { left: x, top: y, color, opacity, transform: [{ translateY }, { scale }] }]}>
      {text}
    </Animated.Text>
  );
});

const ActivePowerUp = React.memo(({ x, y, type, time }) => {
  const scale = 1 + Math.sin(time / 150) * 0.15;
  return (
    <View style={[styles.powerup, { left: x, top: y, transform: [{ scale }] }]}>
      <Text style={styles.powerupIcon}>{type === 'LIFE'?'❤️':type==='SHIELD'?'🛡️':type==='BOMB'?'💣':type==='MAGNET'?'🧲':'⚡'}</Text>
    </View>
  );
});

const PopupNotification = React.memo(({ text, type }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 12 }),
      Animated.delay(2500),
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-100, 20] });
  return (
    <Animated.View style={[styles.popupBanner, type === 'achievement' ? styles.popupAchieve : styles.popupMission, { transform: [{ translateY }] }]}>
      <Text style={styles.popupTitle}>{type === 'achievement' ? '🏆 ACHIEVEMENT UNLOCKED' : '⭐ MISSION COMPLETE'}</Text>
      <Text style={styles.popupText}>{text}</Text>
    </Animated.View>
  );
});

// ==========================================
// IN-MEMORY STORAGE
// ==========================================
let memoryStorage = {
  highScore: 0,
  coins: 0,
  totalKills: 0,
  totalBosses: 0,
  totalCoins: 0,
  upgrades: { ...DEFAULT_UPGRADES },
  achievements: {},
  missions: [],
  settings: { bgm: true, sfx: true, vibration: true, diff: 'Medium' }
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function GameScreen() {
  const [gameState, setGameState] = useState('LOADING'); 
  const [activeOverlay, setActiveOverlay] = useState(null); 

  // Persistent React State
  const [highScore, setHighScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [upgrades, setUpgrades] = useState({ ...DEFAULT_UPGRADES });
  const [achievements, setAchievements] = useState({});
  const [missions, setMissions] = useState([]);
  const [settings, setSettings] = useState({ bgm: true, sfx: true, vibration: true, diff: 'Medium' });

  // Render State (Optimized footprint)
  const [renderData, setRenderData] = useState({
    ship: { x: (SCREEN_WIDTH - SHIP_WIDTH) / 2 },
    lasers: [], enemies: [], bullets: [], powerups: [], physicalCoins: [],
    explosions: [], floatingTexts: [], activeNotification: null, stars: generateStars(),
    boss: null, stats: { score: 0, lives: 3, combo: 0, level: 1, runCoins: 0 },
    buffs: { shield: 0, rapidFire: 0, doubleDamage: 0, magnet: 0 }
  });

  const screenShakeAnim = useRef(new Animated.Value(0)).current;
  const damageFlashAnim = useRef(new Animated.Value(0)).current;

  const requestRef = useRef(null);
  const gameRef = useRef(null);

  // ------------------------------------------
  // INITIALIZATION & PERSISTENCE
  // ------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem(SAVE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          memoryStorage.highScore = parsed.highScore || 0;
          memoryStorage.coins = parsed.coins || 0;
          memoryStorage.totalKills = parsed.totalKills || 0;
          memoryStorage.totalBosses = parsed.totalBosses || 0;
          memoryStorage.totalCoins = parsed.totalCoins || 0;
          memoryStorage.upgrades = { ...DEFAULT_UPGRADES, ...parsed.upgrades };
          memoryStorage.achievements = parsed.achievements || {};
          memoryStorage.settings = parsed.settings || { bgm: true, sfx: true, vibration: true, diff: 'Medium' };
          memoryStorage.missions = parsed.missions?.length === 3 ? parsed.missions : [getRandomMission(), getRandomMission(), getRandomMission()];
        } else {
          memoryStorage.missions = [getRandomMission(), getRandomMission(), getRandomMission()];
        }
        
        setHighScore(memoryStorage.highScore);
        setCoins(memoryStorage.coins);
        setUpgrades(memoryStorage.upgrades);
        setAchievements(memoryStorage.achievements);
        setSettings(memoryStorage.settings);
        setMissions(memoryStorage.missions);

      } catch (e) {
        setMissions([getRandomMission(), getRandomMission(), getRandomMission()]);
      }
      setGameState('START');
    };
    loadData();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  const saveData = async (updates) => {
    try {
      const payload = {
        highScore: updates.highScore !== undefined ? updates.highScore : highScore,
        coins: updates.coins !== undefined ? updates.coins : coins,
        totalKills: updates.totalKills !== undefined ? updates.totalKills : memoryStorage.totalKills,
        totalBosses: updates.totalBosses !== undefined ? updates.totalBosses : memoryStorage.totalBosses,
        totalCoins: updates.totalCoins !== undefined ? updates.totalCoins : memoryStorage.totalCoins,
        upgrades: updates.upgrades || upgrades,
        achievements: updates.achievements || achievements,
        missions: updates.missions || missions,
        settings: updates.settings || settings
      };
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {}
  };

  // ------------------------------------------
  // FX HELPERS
  // ------------------------------------------
  const triggerScreenShake = useCallback((intensity = 10) => {
    screenShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(screenShakeAnim, { toValue: intensity, duration: 40, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: -intensity, duration: 40, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: intensity/2, duration: 40, useNativeDriver: true }),
      Animated.timing(screenShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true })
    ]).start();
  }, [screenShakeAnim]);

  const triggerDamageFlash = useCallback(() => {
    if (settings.vibration) Vibration.vibrate(100);
    damageFlashAnim.setValue(0.6);
    Animated.timing(damageFlashAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
  }, [damageFlashAnim, settings.vibration]);

  const spawnFloatingText = (g, x, y, text, color) => {
    g.floatingTexts.push({ id: Math.random().toString(36), x, y, text, color, life: 800 });
  };

  // ------------------------------------------
  // WEB INPUT HANDLING
  // ------------------------------------------
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e) => {
      if (!gameRef.current || gameRef.current.isPaused || gameRef.current.gameOver) return;
      const code = e.code || e.key;
      if (code === 'KeyA' || code === 'ArrowLeft' || code === 'a') gameRef.current.controls.left = true;
      if (code === 'KeyD' || code === 'ArrowRight' || code === 'd') gameRef.current.controls.right = true;
      if (code === 'Space' || code === ' ') { e.preventDefault(); gameRef.current.controls.fire = true; }
    };
    const handleKeyUp = (e) => {
      if (!gameRef.current) return;
      const code = e.code || e.key;
      if (code === 'KeyA' || code === 'ArrowLeft' || code === 'a') gameRef.current.controls.left = false;
      if (code === 'KeyD' || code === 'ArrowRight' || code === 'd') gameRef.current.controls.right = false;
      if (code === 'Space' || code === ' ') gameRef.current.controls.fire = false;
    };
    const handleMouseDown = () => { if (gameRef.current && !gameRef.current.isPaused) gameRef.current.controls.fire = true; };
    const handleMouseUp = () => { if (gameRef.current) gameRef.current.controls.fire = false; };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ------------------------------------------
  // GAME PROGRESSION LOGIC (Missions/Achievements)
  // ------------------------------------------
  const checkProgress = useCallback((g) => {
    let stateChanged = false;

    // Check Missions
    g.activeMissions.forEach((m, idx) => {
      let val = 0;
      if (m.type === 'KILLS') val = g.stats.kills;
      if (m.type === 'LEVEL') val = g.stats.level;
      if (m.type === 'SCORE') val = g.stats.score;
      if (m.type === 'BOSS') val = g.stats.bossKills;
      if (m.type === 'COINS') val = g.stats.runCoins;
      if (m.type === 'TIME') val = Math.floor(g.stats.runTime);
      if (m.type === 'COMBO') val = g.stats.maxCombo;
      if (m.type === 'POWERUPS') val = g.stats.powerupsCollected;

      if (val >= m.target) {
        // Queue single notification to prevent stacking
        g.notificationQueue.push({ id: Math.random().toString(36), text: m.text, type: 'mission' });
        g.stats.runCoins += 100; // Reward 100 coins
        if (settings.sfx) playCoinSound();
        spawnFloatingText(g, SCREEN_WIDTH/2 - 70, 150, '+100🪙 MISSION!', '#00ffcc');
        
        g.activeMissions[idx] = getRandomMission();
        stateChanged = true;
      } else if (g.activeMissions[idx].progress !== val) {
        g.activeMissions[idx].progress = val;
      }
    });

    // Check Achievements
    ACHIEVEMENTS_LIST.forEach(a => {
      // Check if unlocked locally in the gameRef to guarantee no duplicates
      if (!g.unlockedAchievements[a.id]) {
        let val = 0;
        if (a.type === 'KILLS') val = g.stats.totalKills + g.stats.kills;
        if (a.type === 'BOSS') val = g.stats.totalBosses + g.stats.bossKills;
        if (a.type === 'TIME') val = Math.floor(g.stats.runTime);
        if (a.type === 'COINS') val = g.stats.totalCoins + g.stats.runCoins;
        if (a.type === 'SCORE') val = g.stats.score;

        if (val >= a.target) {
          // Mark instantly on gameRef to stop double triggers
          g.unlockedAchievements[a.id] = true; 
          
          g.notificationQueue.push({ id: Math.random().toString(36), text: a.title, type: 'achievement' });
          if (settings.sfx) playLevelUpSound();
          stateChanged = true;
        }
      }
    });

    if (stateChanged) {
      // Sync local gameRef state with React State
      setMissions([...g.activeMissions]);
      setAchievements({ ...g.unlockedAchievements });
      
      // Save permanently to storage
      saveData({ 
        missions: g.activeMissions, 
        achievements: g.unlockedAchievements 
      });
    }
  }, [settings.sfx]);

  // ------------------------------------------
  // CORE GAME LOOP
  // ------------------------------------------
  const update = useCallback(() => {
    if (!gameRef.current) return;
    const g = gameRef.current;

    if (g.gameOver || g.isPaused) {
      if (!g.gameOver) requestRef.current = requestAnimationFrame(update);
      return;
    }

    const now = Date.now();
    const dt = Math.min(now - g.lastTick, 50); 
    g.lastTick = now;
    g.stats.runTime += dt / 1000;
    g.time += dt;

    // Movement
    const speed = 7 + (upgrades.engine * 1.5);
    if (g.controls.left) g.ship.x = Math.max(0, g.ship.x - speed);
    if (g.controls.right) g.ship.x = Math.min(SCREEN_WIDTH - SHIP_WIDTH, g.ship.x + speed);

    // Buff Timers
    Object.keys(g.buffs).forEach(key => {
      if (g.buffs[key] > 0) g.buffs[key] = Math.max(0, g.buffs[key] - dt);
    });

    // Notification Queue Processing (One at a time)
    if (!g.activeNotification && g.notificationQueue.length > 0) {
      g.activeNotification = g.notificationQueue.shift();
      g.activeNotification.life = 3500; // Duration to show on screen
    }
    if (g.activeNotification) {
      g.activeNotification.life -= dt;
      if (g.activeNotification.life <= 0) {
        g.activeNotification = null;
      }
    }

    // Firing
    const fireRate = g.buffs.rapidFire > 0 ? 90 : Math.max(90, 220 - (upgrades.fireRate * 25));
    if (g.controls.fire && now - g.lastFired > fireRate) {
      g.lastFired = now;
      const dmg = (1 + (upgrades.laser * 0.5)) * (g.buffs.doubleDamage > 0 ? 2 : 1);
      g.lasers.push({
        id: Math.random().toString(36).substr(2, 9),
        x: g.ship.x + SHIP_WIDTH / 2 - LASER_WIDTH / 2,
        y: SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - SHIP_HEIGHT,
        dmg,
        isRed: g.buffs.doubleDamage > 0
      });
      if (settings.sfx) playShootSound();
    }

    // Move Stars
    g.stars.forEach(s => {
      s.y += s.speed;
      if (s.y > SCREEN_HEIGHT) { s.y = -10; s.x = Math.random() * SCREEN_WIDTH; }
    });

    // Move Projectiles
    g.lasers = g.lasers.map(l => ({ ...l, y: l.y - LASER_SPEED })).filter(l => l.y > -50);
    g.bullets = g.bullets.map(b => ({ ...b, y: b.y + b.speed, x: b.x + (b.dx || 0) })).filter(b => b.y < SCREEN_HEIGHT + 50);

    // Enemy Spawning (Variety Added)
    const baseSpawnRate = 0.015 + (g.stats.level * 0.003);
    if (!g.boss && now - g.lastEnemySpawn > 400 && Math.random() < baseSpawnRate) {
      g.lastEnemySpawn = now;
      const types = ['SCOUT', 'FIGHTER', 'HEAVY', 'ELITE', 'TANK'];
      const maxTypeIdx = Math.min(types.length - 1, g.stats.level - 1 + Math.floor(g.stats.level/2));
      const type = types[Math.floor(Math.random() * Math.min(maxTypeIdx + 1, types.length))];
      
      g.enemies.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * (SCREEN_WIDTH - ENEMY_WIDTH),
        y: -ENEMY_HEIGHT,
        type,
        hp: type === 'TANK' ? 8 : type === 'HEAVY' ? 5 : type === 'ELITE' ? 3 : 1,
        startX: Math.random() * SCREEN_WIDTH,
        time: 0
      });
    }

    // Enemy Movement & AI
    g.enemies = g.enemies.map(e => {
      e.time += dt;
      if (e.type === 'SCOUT') {
        e.y += 4.5;
      } else if (e.type === 'FIGHTER') {
        e.y += 3;
        e.x = e.startX + Math.sin(e.time / 200) * 50;
      } else if (e.type === 'HEAVY') {
        e.y += 1.8;
      } else if (e.type === 'ELITE') {
        e.y += 3.5;
        e.x += (g.ship.x - e.x) * 0.015; // Kamikaze track
      } else if (e.type === 'TANK') {
        e.y += e.y < 150 ? 3 : 0.8; // Charge then slow down to shoot
      }
      
      // Enemy Fire
      if ((e.type === 'FIGHTER' || e.type === 'ELITE' || e.type === 'TANK') && Math.random() < 0.012) {
        g.bullets.push({ 
          id: Math.random().toString(36).substr(2, 9), 
          x: e.x + ENEMY_WIDTH / 2, 
          y: e.y + ENEMY_HEIGHT, 
          speed: ENEMY_BULLET_SPEED 
        });
      }
      return e;
    }).filter(e => e.y < SCREEN_HEIGHT);

    // Boss Logic
    if (g.boss) {
      if (g.boss.y < 50) g.boss.y += 1.5;
      else {
        g.boss.x += g.boss.dir * (g.boss.phase === 3 ? 4 : 2);
        if (g.boss.x <= 10 || g.boss.x >= SCREEN_WIDTH - BOSS_WIDTH - 10) g.boss.dir *= -1;

        if (g.boss.hp < g.boss.maxHp * 0.3) g.boss.phase = 3;
        else if (g.boss.hp < g.boss.maxHp * 0.6) g.boss.phase = 2;

        const bossFireCooldown = g.boss.phase === 3 ? 500 : g.boss.phase === 2 ? 900 : 1400;
        if (now - g.boss.lastFired > bossFireCooldown) {
          g.boss.lastFired = now;
          if (settings.sfx) playBossSound();
          
          if (g.boss.phase === 1) {
            g.bullets.push(
              { id: Math.random().toString(36), x: g.boss.x + 20, y: g.boss.y + BOSS_HEIGHT, speed: 6 },
              { id: Math.random().toString(36), x: g.boss.x + BOSS_WIDTH - 20, y: g.boss.y + BOSS_HEIGHT, speed: 6 }
            );
          } else if (g.boss.phase === 2) {
            [-3, 0, 3].forEach(dx => {
              g.bullets.push({ id: Math.random().toString(36), x: g.boss.x + BOSS_WIDTH / 2, y: g.boss.y + BOSS_HEIGHT, speed: 7, dx });
            });
          } else {
            g.bullets.push(
              { id: Math.random().toString(36), x: g.boss.x + 20, y: g.boss.y + BOSS_HEIGHT, speed: 8, dx: -2 },
              { id: Math.random().toString(36), x: g.boss.x + BOSS_WIDTH / 2, y: g.boss.y + BOSS_HEIGHT, speed: 9 },
              { id: Math.random().toString(36), x: g.boss.x + BOSS_WIDTH - 20, y: g.boss.y + BOSS_HEIGHT, speed: 8, dx: 2 }
            );
          }
        }
      }
    }

    // Magnet Effect
    const magnetActive = g.buffs.magnet > 0;
    g.powerups = g.powerups.map(p => {
      if (magnetActive) {
        p.x += (g.ship.x - p.x) * 0.08;
        p.y += (SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - p.y) * 0.08;
      } else p.y += 3;
      return p;
    }).filter(p => p.y < SCREEN_HEIGHT);

    g.physicalCoins = g.physicalCoins.map(c => {
      if (magnetActive) {
        c.x += (g.ship.x - c.x) * 0.1;
        c.y += (SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - c.y) * 0.1;
      } else c.y += 4.5;
      return c;
    }).filter(c => c.y < SCREEN_HEIGHT);

    // Drop Pickups
    if (Math.random() < 0.0025) {
      const pTypes = ['LIFE', 'SHIELD', 'RAPID_FIRE', 'DOUBLE_DAMAGE', 'MAGNET', 'BOMB'];
      g.powerups.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * (SCREEN_WIDTH - POWERUP_SIZE),
        y: -POWERUP_SIZE,
        type: pTypes[Math.floor(Math.random() * pTypes.length)],
        time: 0
      });
    }

    // ----------------------------------------
    // COLLISIONS
    // ----------------------------------------
    const shipRect = { x: g.ship.x + 12, y: SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - SHIP_HEIGHT + 12, w: SHIP_WIDTH - 24, h: SHIP_HEIGHT - 24 };

    const handlePlayerDamage = () => {
      if (g.buffs.shield > 0) {
        g.buffs.shield = 0;
        if (settings.sfx) playDamageSound();
        triggerScreenShake(5);
        return;
      }
      g.stats.lives--;
      g.stats.combo = 0;
      triggerDamageFlash();
      triggerScreenShake(15);
      if (settings.sfx) playDamageSound();
      
      if (g.stats.lives <= 0) handleGameOver();
    };

    // Lasers hit Boss
    g.lasers.forEach(l => {
      let hit = false;
      const lRect = { x: l.x, y: l.y, w: LASER_WIDTH, h: LASER_HEIGHT };

      if (g.boss && rectIntersect(lRect, { x: g.boss.x, y: g.boss.y, w: BOSS_WIDTH, h: BOSS_HEIGHT })) {
        g.boss.hp -= l.dmg;
        hit = true;
        spawnFloatingText(g, l.x, l.y, `${l.dmg}`, '#ffea00');
        
        if (g.boss.hp <= 0) {
          g.explosions.push({ id: Math.random().toString(36), x: g.boss.x + BOSS_WIDTH/2 - EXPLOSION_SIZE, y: g.boss.y, size: EXPLOSION_SIZE * 2.5 });
          if (settings.sfx) playExplosionSound();
          triggerScreenShake(20);
          g.stats.score += 2000;
          g.stats.bossKills++;
          g.boss = null;
          
          spawnFloatingText(g, SCREEN_WIDTH/2 - 70, SCREEN_HEIGHT/2, 'BOSS DEFEATED!', '#00ffcc');
          
          // Progress to Next World/Level
          g.stats.level++;
          g.stats.world++;
          if (settings.sfx) playLevelUpSound();
        }
      }

      // Lasers hit Enemies
      if (!hit) {
        for (let i = g.enemies.length - 1; i >= 0; i--) {
          const e = g.enemies[i];
          if (rectIntersect(lRect, { x: e.x, y: e.y, w: ENEMY_WIDTH, h: ENEMY_HEIGHT })) {
            e.hp -= l.dmg;
            hit = true;
            if (e.hp <= 0) {
              g.explosions.push({ id: Math.random().toString(36), x: e.x, y: e.y, size: EXPLOSION_SIZE });
              if (settings.sfx) playExplosionSound();
              g.enemies.splice(i, 1);
              g.stats.kills++;
              
              // Combo Logic
              g.stats.combo++;
              if (g.stats.combo > g.stats.maxCombo) g.stats.maxCombo = g.stats.combo;
              g.stats.comboTimer = 3000;
              const points = 10 + (Math.min(g.stats.combo, 10) * 5);
              g.stats.score += points;
              
              spawnFloatingText(g, e.x, e.y, `+${points}`, '#fff');
              if (g.stats.combo >= 3) spawnFloatingText(g, e.x, e.y - 20, `x${g.stats.combo}`, '#ffaa00');
              
              if (Math.random() < 0.45) g.physicalCoins.push({ id: Math.random().toString(36), x: e.x + 15, y: e.y });
            }
            break;
          }
        }
      }
      if (hit) l.y = -100;
    });

    // Combo Decay
    if (g.stats.combo > 0) {
      g.stats.comboTimer -= dt;
      if (g.stats.comboTimer <= 0) g.stats.combo = 0;
    }

    // Ship hit by Bullets
    g.bullets.forEach(b => {
      if (rectIntersect({ x: b.x, y: b.y, w: ENEMY_BULLET_WIDTH, h: ENEMY_BULLET_HEIGHT }, shipRect)) {
        b.y = SCREEN_HEIGHT + 100;
        handlePlayerDamage();
      }
    });

    // Ship hit by Enemies
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (rectIntersect({ x: e.x, y: e.y, w: ENEMY_WIDTH, h: ENEMY_HEIGHT }, shipRect)) {
        g.explosions.push({ id: Math.random().toString(36), x: e.x, y: e.y, size: EXPLOSION_SIZE });
        g.enemies.splice(i, 1);
        handlePlayerDamage();
      }
    }

    // Collect Powerups
    g.powerups = g.powerups.filter(p => {
      if (rectIntersect({ x: p.x, y: p.y, w: POWERUP_SIZE, h: POWERUP_SIZE }, shipRect)) {
        if (settings.sfx) playPowerupSound();
        g.stats.powerupsCollected++;
        spawnFloatingText(g, p.x, p.y, p.type, '#00ffcc');
        
        if (p.type === 'LIFE') g.stats.lives++;
        else if (p.type === 'BOMB') {
          triggerScreenShake(15);
          g.enemies.forEach(e => g.explosions.push({ id: Math.random().toString(36), x: e.x, y: e.y, size: EXPLOSION_SIZE }));
          g.stats.score += g.enemies.length * 25;
          g.enemies = [];
        } else {
          let key = null;
          if (p.type === 'SHIELD') key = 'shield';
          else if (p.type === 'RAPID_FIRE') key = 'rapidFire';
          else if (p.type === 'MAGNET') key = 'doubleDamage';
          if (key) g.buffs[key] = 12000;
        }
        return false;
      }
      return true;
    });

    // Collect Coins
    g.physicalCoins = g.physicalCoins.filter(c => {
      if (rectIntersect({ x: c.x, y: c.y, w: COIN_SIZE, h: COIN_SIZE }, shipRect)) {
        if (settings.sfx) playCoinSound();
        g.stats.runCoins++;
        g.stats.score += 5;
        spawnFloatingText(g, c.x, c.y - 10, '+1🪙', '#ffea00');
        return false;
      }
      return true;
    });

    // Level Progression Logic (Boss every 5 levels)
    const targetLevel = Math.min(99, 1 + Math.floor(g.stats.score / 3000) + g.stats.world * 5);
    if (targetLevel > g.stats.level) {
      g.stats.level = targetLevel;
      if (settings.sfx) playLevelUpSound();
      spawnFloatingText(g, SCREEN_WIDTH/2 - 40, SCREEN_HEIGHT/2, `LEVEL ${targetLevel}!`, '#fff');
      
      if (g.stats.level % 5 === 0 && !g.boss) {
        const bossHp = BOSS_BASE_HP + (g.stats.world * 300);
        g.boss = { x: (SCREEN_WIDTH - BOSS_WIDTH) / 2, y: -BOSS_HEIGHT, hp: bossHp, maxHp: bossHp, phase: 1, dir: 1, lastFired: now };
      }
    }

    // Periodically check missions/achievements (every 500ms to save CPU)
    if (now - g.lastProgressCheck > 500) {
      g.lastProgressCheck = now;
      checkProgress(g);
    }

    // Sync state for rendering (Throttled to ~40 FPS for Performance)
    if (now - g.lastRender >= 24) {
      g.lastRender = now;
      setRenderData({
        ship: { x: g.ship.x },
        lasers: [...g.lasers],
        enemies: [...g.enemies],
        bullets: [...g.bullets],
        powerups: [...g.powerups],
        physicalCoins: [...g.physicalCoins],
        explosions: [...g.explosions], 
        floatingTexts: [...g.floatingTexts], 
        activeNotification: g.activeNotification ? { ...g.activeNotification } : null,
        stars: [...g.stars],
        boss: g.boss ? { ...g.boss } : null,
        stats: { ...g.stats },
        buffs: { ...g.buffs }
      });

      // Clear one-time render arrays from ref after feeding them to React State
      g.explosions = [];
      g.floatingTexts = [];
    }

    requestRef.current = requestAnimationFrame(update);
  }, [upgrades, settings, triggerScreenShake, triggerDamageFlash, checkProgress]);

  // ------------------------------------------
  // GAME LIFECYCLE
  // ------------------------------------------
  const startGame = () => {
    if (settings.sfx) playClickSound();
    
    const initialBuffs = { shield: 0, rapidFire: 0, doubleDamage: 0, magnet: 0 };
    if (upgrades.shieldUses > 0) initialBuffs.shield = 10000 + (upgrades.shieldUses * 5000);
    if (upgrades.rapidFireStart > 0) initialBuffs.rapidFire = 10000 + (upgrades.rapidFireStart * 5000);
    if (upgrades.doubleDamageStart > 0) initialBuffs.doubleDamage = 10000 + (upgrades.doubleDamageStart * 5000);
    if (upgrades.magnetStart > 0) initialBuffs.magnet = 10000 + (upgrades.magnetStart * 5000);

    gameRef.current = {
      ship: { x: (SCREEN_WIDTH - SHIP_WIDTH) / 2 },
      lasers: [], enemies: [], bullets: [], powerups: [], physicalCoins: [],
      explosions: [], floatingTexts: [], notificationQueue: [], activeNotification: null,
      stars: generateStars(), boss: null,
      stats: { 
        score: 0, lives: 3 + upgrades.extraLife, combo: 0, maxCombo: 0, comboTimer: 0, 
        level: 1, world: 0, kills: 0, bossKills: 0, runCoins: 0, runTime: 0, powerupsCollected: 0, 
        totalKills: memoryStorage.totalKills, 
        totalBosses: memoryStorage.totalBosses, 
        totalCoins: memoryStorage.totalCoins 
      },
      buffs: initialBuffs,
      controls: { left: false, right: false, fire: false },
      lastTick: Date.now(), time: 0, lastFired: 0, lastEnemySpawn: 0, lastProgressCheck: 0, lastRender: 0,
      isPaused: false, gameOver: false,
      activeMissions: JSON.parse(JSON.stringify(missions)),
      unlockedAchievements: { ...achievements } // SYNC SOURCE OF TRUTH
    };

    setGameState('PLAYING');
    setActiveOverlay(null);
    requestRef.current = requestAnimationFrame(update);
  };

  const handleGameOver = () => {
    if (gameRef.current) gameRef.current.gameOver = true;
    setGameState('GAMEOVER');

    const runCoins = Math.floor(gameRef.current.stats.runCoins * (upgrades.coinBoost > 0 ? 2 : 1));
    const newTotalCoins = coins + runCoins;
    const isNewHigh = gameRef.current.stats.score > highScore;
    const bestScore = isNewHigh ? gameRef.current.stats.score : highScore;

    // Persist session totals
    memoryStorage.totalKills += gameRef.current.stats.kills;
    memoryStorage.totalBosses += gameRef.current.stats.bossKills;
    memoryStorage.totalCoins += runCoins;

    setCoins(newTotalCoins);
    if (isNewHigh) setHighScore(bestScore);

    saveData({ 
      coins: newTotalCoins, 
      highScore: bestScore,
      totalKills: memoryStorage.totalKills,
      totalBosses: memoryStorage.totalBosses,
      totalCoins: memoryStorage.totalCoins
    });
  };

  const pauseGame = () => {
    if (settings.sfx) playClickSound();
    if (gameRef.current) gameRef.current.isPaused = true;
    setGameState('PAUSED');
  };

  const resumeGame = () => {
    if (settings.sfx) playClickSound();
    if (gameRef.current) {
      gameRef.current.isPaused = false;
      gameRef.current.lastTick = Date.now();
    }
    setGameState('PLAYING');
    requestRef.current = requestAnimationFrame(update);
  };

  // ------------------------------------------
  // UI MENUS
  // ------------------------------------------
  const renderStartMenu = () => (
    <View style={styles.overlay}>
      <Text style={styles.titleText}>NEON WARS</Text>
      <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8} onPress={startGame}>
        <Text style={styles.btnPrimaryText}>PLAY NOW</Text>
      </TouchableOpacity>
      
      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.btnIcon} activeOpacity={0.7} onPress={() => { if(settings.sfx) playClickSound(); setActiveOverlay('SHOP'); }}>
          <Text style={styles.btnIconText}>🛒 Shop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnIcon} activeOpacity={0.7} onPress={() => { if(settings.sfx) playClickSound(); setActiveOverlay('ACHIEVEMENTS'); }}>
          <Text style={styles.btnIconText}>🏆 Missions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnIcon} activeOpacity={0.7} onPress={() => { if(settings.sfx) playClickSound(); setActiveOverlay('INSTRUCTIONS'); }}>
          <Text style={styles.btnIconText}>📖 How To</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnIcon} activeOpacity={0.7} onPress={() => { if(settings.sfx) playClickSound(); setActiveOverlay('SETTINGS'); }}>
          <Text style={styles.btnIconText}>⚙️ Setup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHUD = () => (
    <View style={styles.hudContainer}>
      <View style={styles.hudLeft}>
        <Text style={styles.hudText}>Score: <Text style={{color: '#fff'}}>{renderData.stats.score}</Text></Text>
        <Text style={styles.hudSub}>High: {highScore}</Text>
        <Text style={styles.hudLevel}>Level {renderData.stats.level % 5 === 0 ? '⚠️ BOSS' : renderData.stats.level}</Text>
      </View>
      
      <View style={styles.hudCenter}>
        {renderData.stats.combo > 1 && <Text style={styles.comboText}>COMBO x{renderData.stats.combo}</Text>}
        <View style={styles.buffsRow}>
          {renderData.buffs.shield > 0 && <View style={[styles.buffBadge, {backgroundColor: '#3498db'}]}><Text style={styles.buffText}>SHIELD</Text></View>}
          {renderData.buffs.rapidFire > 0 && <View style={[styles.buffBadge, {backgroundColor: '#e74c3c'}]}><Text style={styles.buffText}>RAPID</Text></View>}
          {renderData.buffs.doubleDamage > 0 && <View style={[styles.buffBadge, {backgroundColor: '#f39c12'}]}><Text style={styles.buffText}>DAMAGE</Text></View>}
          {renderData.buffs.magnet > 0 && <View style={[styles.buffBadge, {backgroundColor: '#9b59b6'}]}><Text style={styles.buffText}>MAGNET</Text></View>}
        </View>
      </View>
      
      <View style={styles.hudRight}>
        <Text style={styles.hudLives}>{'❤️'.repeat(Math.max(0, renderData.stats.lives))}</Text>
        <Text style={styles.hudCoins}>🪙 {coins + renderData.stats.runCoins}</Text>
        <TouchableOpacity style={styles.pauseBtn} activeOpacity={0.7} onPress={pauseGame}>
          <Text style={styles.pauseBtnText}>⏸️ Pause</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderShop = () => (
    <View style={styles.modal}>
      <Text style={styles.modalTitle}>SHOP & UPGRADES</Text>
      <Text style={styles.modalSub}>🪙 {coins} Coins Available</Text>
      <View style={styles.scrollArea}>
        {SHOP_ITEMS.map(item => {
          const currentLvl = upgrades[item.id] || 0;
          const cost = item.baseCost * (currentLvl + 1);
          const maxed = currentLvl >= item.maxLevel;
          const canBuy = coins >= cost;
          return (
            <View key={item.id} style={styles.shopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopItemName}>{item.name} <Text style={styles.shopItemLevel}>(Lv {currentLvl}/{item.maxLevel})</Text></Text>
                <Text style={styles.shopItemDesc}>{item.desc}</Text>
              </View>
              <TouchableOpacity
                style={[styles.buyBtn, (!canBuy || maxed) && styles.buyBtnDisabled]}
                disabled={!canBuy || maxed}
                activeOpacity={0.7}
                onPress={() => {
                  if (settings.sfx) playCoinSound();
                  const newCoins = coins - cost;
                  const newUpgrades = { ...upgrades, [item.id]: currentLvl + 1 };
                  setCoins(newCoins);
                  setUpgrades(newUpgrades);
                  saveData({ coins: newCoins, upgrades: newUpgrades });
                }}
              >
                <Text style={styles.buyBtnText}>{maxed ? 'MAX' : `🪙 ${cost}`}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={() => { if(settings.sfx) playClickSound(); setActiveOverlay(null); }}>
        <Text style={styles.closeBtnText}>CLOSE</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGameOver = () => (
    <View style={styles.overlay}>
      <Text style={[styles.titleText, { color: '#ff3366', textShadowColor: '#ff3366' }]}>GAME OVER</Text>
      <View style={styles.statsBox}>
        <Text style={styles.statText}>Final Score: <Text style={styles.statValue}>{renderData.stats.score}</Text></Text>
        <Text style={styles.statText}>Coins Gathered: <Text style={styles.statValue}>{gameRef.current?.stats.runCoins || 0} 🪙</Text></Text>
        <Text style={styles.statText}>Enemies Defeated: <Text style={styles.statValue}>{gameRef.current?.stats.kills || 0}</Text></Text>
        <Text style={styles.statText}>Bosses Defeated: <Text style={styles.statValue}>{gameRef.current?.stats.bossKills || 0}</Text></Text>
        <Text style={styles.statText}>Level Reached: <Text style={styles.statValue}>{renderData.stats.level}</Text></Text>
      </View>
      <TouchableOpacity style={[styles.btnPrimary, { width: 260 }]} activeOpacity={0.8} onPress={startGame}>
        <Text style={styles.btnPrimaryText}>PLAY AGAIN</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnIcon, { width: 260, marginTop: 15, paddingVertical: 12 }]} activeOpacity={0.8} onPress={() => { if(settings.sfx) playClickSound(); setGameState('START'); }}>
        <Text style={[styles.btnIconText, { fontSize: 16 }]}>🏠 MAIN MENU</Text>
      </TouchableOpacity>
    </View>
  );

  // ------------------------------------------
  // GAME WORLD RENDERING
  // ------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* BACKGROUND & STARS */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {renderData.stars.map(s => (
          <View key={s.id} style={[styles.star, { left: s.x, top: s.y, width: s.size, height: s.size, opacity: s.opacity }]} />
        ))}
      </View>

      {/* GAME WORLD (With Screen Shake) */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'GAMEOVER') && (
        <Animated.View style={[styles.gameWorld, { transform: [{ translateX: screenShakeAnim }, { translateY: screenShakeAnim }] }]} pointerEvents="none">
          
          {/* LASERS */}
          {renderData.lasers.map(l => (
            <View key={l.id} style={[styles.laser, l.isRed && { backgroundColor: '#ffaa00', shadowColor: '#ffaa00' }, { left: l.x, top: l.y }]} />
          ))}

          {/* BULLETS */}
          {renderData.bullets.map(b => (
            <View key={b.id} style={[styles.enemyBullet, { left: b.x, top: b.y }]} />
          ))}

          {/* ENEMIES */}
          {renderData.enemies.map(e => (
            <View key={e.id} style={[styles.enemy, styles[`enemy${e.type}`], { left: e.x, top: e.y }]}>
              {e.type === 'HEAVY' && <View style={styles.heavyArmor} />}
              {e.type === 'TANK' && <View style={styles.tankShield} />}
            </View>
          ))}

          {/* BOSS */}
          {renderData.boss && (
            <View style={[styles.boss, { left: renderData.boss.x, top: renderData.boss.y }]}>
              <View style={styles.bossCore} />
              <View style={styles.bossWingL} /><View style={styles.bossWingR} />
              <View style={styles.bossHpTrack}>
                <View style={[styles.bossHpBar, { width: `${(renderData.boss.hp / renderData.boss.maxHp) * 100}%` }]} />
              </View>
            </View>
          )}

          {/* POWERUPS & COINS */}
          {renderData.powerups.map(p => (
            <ActivePowerUp key={p.id} x={p.x} y={p.y} type={p.type} time={gameRef.current?.time || 0} />
          ))}
          {renderData.physicalCoins.map(c => (
            <View key={c.id} style={[styles.coin, { left: c.x, top: c.y }]}><Text style={styles.coinText}>🪙</Text></View>
          ))}

          {/* PLAYER SHIP (NO UPLOADED IMAGE) */}
          <View style={[styles.ship, { left: renderData.ship.x, bottom: SHIP_BOTTOM_OFFSET }]}>
             {renderData.buffs.shield > 0 && <View style={styles.shipShield} />}
             <View style={styles.shipWingLeft} />
             <View style={styles.shipBody} />
             <View style={styles.shipWingRight} />
             <View style={styles.engineFlame} />
          </View>

          {/* EXPLOSIONS & TEXT (Rendered via sub-components to prevent main state bloat) */}
          {renderData.explosions.map(ex => (
            <ParticleExplosion key={ex.id} x={ex.x} y={ex.y} size={ex.size} />
          ))}
          {renderData.floatingTexts.map(ft => (
            <FloatingText key={ft.id} x={ft.x} y={ft.y} text={ft.text} color={ft.color} />
          ))}
        </Animated.View>
      )}

      {/* SINGLE NOTIFICATION QUEUE OVERLAY */}
      {renderData.activeNotification && (
        <View style={styles.notificationsContainer} pointerEvents="none">
          <PopupNotification 
            key={renderData.activeNotification.id} 
            text={renderData.activeNotification.text} 
            type={renderData.activeNotification.type} 
          />
        </View>
      )}

      {/* DAMAGE FLASH OVERLAY */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,0,0,0.5)', opacity: damageFlashAnim }]} pointerEvents="none" />

      {/* HUD & MOBILE CONTROLS */}
      {gameState === 'PLAYING' && (
        <>
          {renderHUD()}
          {Platform.OS !== 'web' && (
            <View style={styles.mobileControls}>
              <TouchableOpacity
                onPressIn={() => { if(gameRef.current) gameRef.current.controls.left = true; }}
                onPressOut={() => { if(gameRef.current) gameRef.current.controls.left = false; }}
                activeOpacity={0.6}
                style={styles.ctrlBtn}><Text style={styles.ctrlText}>◀</Text></TouchableOpacity>
              
              <TouchableOpacity
                onPressIn={() => { if(gameRef.current) gameRef.current.controls.fire = true; }}
                onPressOut={() => { if(gameRef.current) gameRef.current.controls.fire = false; }}
                activeOpacity={0.6}
                style={styles.fireBtn}><Text style={styles.fireText}>FIRE</Text></TouchableOpacity>
              
              <TouchableOpacity
                onPressIn={() => { if(gameRef.current) gameRef.current.controls.right = true; }}
                onPressOut={() => { if(gameRef.current) gameRef.current.controls.right = false; }}
                activeOpacity={0.6}
                style={styles.ctrlBtn}><Text style={styles.ctrlText}>▶</Text></TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* MENUS / OVERLAYS */}
      {gameState === 'LOADING' && <View style={styles.overlay}><Text style={styles.titleText}>LOADING...</Text></View>}
      {gameState === 'START' && renderStartMenu()}
      {gameState === 'GAMEOVER' && renderGameOver()}
      {gameState === 'PAUSED' && (
        <View style={styles.overlay}>
          <Text style={styles.titleText}>PAUSED</Text>
          <TouchableOpacity style={[styles.btnPrimary, {marginTop:20, width: 220}]} activeOpacity={0.8} onPress={resumeGame}>
            <Text style={styles.btnPrimaryText}>RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnIcon, {marginTop:15, width: 220, paddingVertical: 12}]} activeOpacity={0.8} onPress={() => { if(settings.sfx) playClickSound(); setGameState('START'); }}>
            <Text style={[styles.btnIconText, {fontSize: 16}]}>QUIT TO MENU</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeOverlay === 'SHOP' && renderShop()}
      
      {activeOverlay === 'INSTRUCTIONS' && (
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>HOW TO PLAY</Text>
          <Text style={styles.instText}>◀ ▶ Move Ship (Arrow Keys/A D)</Text>
          <Text style={styles.instText}>🎯 Hold FIRE to shoot (Space/Mouse)</Text>
          <Text style={styles.instText}>🪙 Collect coins from destroyed enemies</Text>
          <Text style={styles.instText}>⚙️ Buy upgrades in Shop to get stronger</Text>
          <Text style={styles.instText}>👹 Defeat bosses every 5 levels</Text>
          <TouchableOpacity style={[styles.btnPrimary, {marginTop:30}]} activeOpacity={0.8} onPress={() => { if(settings.sfx) playClickSound(); setActiveOverlay(null); }}>
            <Text style={styles.btnPrimaryText}>GOT IT</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {activeOverlay === 'SETTINGS' && (
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>SETTINGS</Text>
          {['bgm', 'sfx', 'vibration'].map(k => (
            <View key={k} style={styles.settingRow}>
              <Text style={styles.settingText}>{k.toUpperCase()}</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, settings[k] && styles.toggleOn]}
                activeOpacity={0.8}
                onPress={() => {
                  if(settings.sfx) playClickSound();
                  const s = {...settings, [k]: !settings[k]};
                  setSettings(s);
                  saveData({settings: s});
                }}>
                <Text style={styles.toggleText}>{settings[k] ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={() => { if(settings.sfx) playClickSound(); setActiveOverlay(null); }}>
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {activeOverlay === 'ACHIEVEMENTS' && (
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>ACHIEVEMENTS & MISSIONS</Text>
          <View style={styles.scrollArea}>
            <Text style={[styles.settingText, {color: '#00ffcc', marginBottom: 10}]}>Active Missions (100🪙 each)</Text>
            {missions.map(m => (
               <View key={m.id} style={styles.achieveRow}>
                  <Text style={styles.achieveTitle}>{m.text}</Text>
                  <Text style={styles.achieveDesc}>Progress: {m.progress || 0} / {m.target}</Text>
               </View>
            ))}
            <Text style={[styles.settingText, {color: '#ffaa00', marginTop: 15, marginBottom: 10}]}>Achievements</Text>
            {ACHIEVEMENTS_LIST.map(a => {
              const done = achievements[a.id];
              return (
                <View key={a.id} style={[styles.achieveRow, done && styles.achieveDone]}>
                  <Text style={styles.achieveTitle}>{a.title} {done && '🏆'}</Text>
                  <Text style={styles.achieveDesc}>{a.desc}</Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={() => { if(settings.sfx) playClickSound(); setActiveOverlay(null); }}>
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070a1a' },
  gameWorld: { flex: 1, overflow: 'hidden' },
  star: { position: 'absolute', backgroundColor: '#e2f1ff', borderRadius: 50 },
  
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,10,25,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100 },
  modal: { position: 'absolute', top: 50, left: 20, right: 20, bottom: 50, backgroundColor: '#131836', borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#3498db', zIndex: 110, elevation: 10 },
  
  titleText: { fontSize: 46, fontWeight: '900', color: '#00ffcc', textShadowColor: '#00ffcc', textShadowRadius: 15, marginBottom: 40, letterSpacing: 3, textAlign: 'center' },
  
  btnPrimary: { backgroundColor: '#00ffcc', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 30, shadowColor: '#00ffcc', shadowRadius: 12, shadowOpacity: 0.8, elevation: 6, marginBottom: 20, alignItems: 'center' },
  btnPrimaryText: { color: '#050a1f', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  btnIcon: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 15, borderRadius: 15, margin: 8, borderWidth: 1, borderColor: '#3498db', width: '45%', alignItems: 'center' },
  btnIconText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 320 },
  
  hudContainer: { position: 'absolute', top: 45, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between', zIndex: 50 },
  hudLeft: { flex: 1, alignItems: 'flex-start' },
  hudCenter: { flex: 1, alignItems: 'center' },
  hudRight: { flex: 1, alignItems: 'flex-end' },
  
  hudText: { color: '#00ffcc', fontSize: 16, fontWeight: '800' },
  hudSub: { color: '#aab7c4', fontSize: 12, fontWeight: '600' },
  hudLevel: { color: '#ffea00', fontSize: 14, fontWeight: '800', marginTop: 4 },
  hudLives: { fontSize: 20, marginBottom: 4 },
  hudCoins: { color: '#ffaa00', fontSize: 16, fontWeight: '800' },
  comboText: { color: '#ff3366', fontSize: 22, fontWeight: '900', textShadowColor: '#ff3366', textShadowRadius: 8, fontStyle: 'italic' },
  
  buffsRow: { flexDirection: 'row', marginTop: 5 },
  buffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginHorizontal: 2 },
  buffText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  
  pauseBtn: { marginTop: 8, backgroundColor: 'rgba(52, 152, 219, 0.3)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3498db' },
  pauseBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  mobileControls: { position: 'absolute', bottom: 35, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 },
  ctrlBtn: { backgroundColor: 'rgba(255,255,255,0.1)', width: 75, height: 75, borderRadius: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  ctrlText: { color: '#fff', fontSize: 32 },
  fireBtn: { backgroundColor: 'rgba(255, 51, 102, 0.7)', width: 95, height: 95, borderRadius: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#ff3366', shadowColor: '#ff3366', shadowRadius: 10, shadowOpacity: 0.6 },
  fireText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },

  ship: { position: 'absolute', width: SHIP_WIDTH, height: SHIP_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  shipImage: { width: SHIP_WIDTH, height: SHIP_HEIGHT, resizeMode: 'contain', zIndex: 2 },
  shipBody: { width: 18, height: 46, backgroundColor: '#00ffcc', borderRadius: 9, zIndex: 2 },
  shipWingLeft: { position: 'absolute', left: 4, bottom: 6, width: 18, height: 28, backgroundColor: '#3498db', borderTopLeftRadius: 18, borderBottomLeftRadius: 6, zIndex: 1 },
  shipWingRight: { position: 'absolute', right: 4, bottom: 6, width: 18, height: 28, backgroundColor: '#3498db', borderTopRightRadius: 18, borderBottomRightRadius: 6, zIndex: 1 },
  engineFlame: { position: 'absolute', bottom: -18, width: 12, height: 22, backgroundColor: '#ffaa00', borderRadius: 6, zIndex: 0, opacity: 0.9, shadowColor: '#ffaa00', shadowRadius: 10, shadowOpacity: 1 },
  shipShield: { position: 'absolute', width: SHIP_WIDTH+24, height: SHIP_HEIGHT+24, borderRadius: 50, borderWidth: 3, borderColor: '#3498db', backgroundColor: 'rgba(52,152,219,0.25)', zIndex: 4, shadowColor: '#3498db', shadowRadius: 10, shadowOpacity: 0.8 },

  laser: { position: 'absolute', width: LASER_WIDTH, height: LASER_HEIGHT, backgroundColor: '#00ffcc', borderRadius: 3, shadowColor: '#00ffcc', shadowRadius: 8, shadowOpacity: 1, elevation: 5 },
  enemyBullet: { position: 'absolute', width: ENEMY_BULLET_WIDTH, height: ENEMY_BULLET_HEIGHT, backgroundColor: '#ff3366', borderRadius: 3, shadowColor: '#ff3366', shadowRadius: 6, shadowOpacity: 1 },
  
  enemy: { position: 'absolute', width: ENEMY_WIDTH, height: ENEMY_HEIGHT, borderRadius: 12, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'center', shadowColor: '#e74c3c', shadowRadius: 8, shadowOpacity: 0.8 },
  enemySCOUT: { borderBottomWidth: 16, borderBottomColor: '#c0392b', borderRadius: 25 },
  enemyFIGHTER: { width: 44, height: 44, transform: [{ rotate: '45deg' }] },
  enemyHEAVY: { backgroundColor: '#7f8c8d', width: 60, height: 60, borderRadius: 8 },
  heavyArmor: { width: 42, height: 42, backgroundColor: '#2c3e50', borderRadius: 6 },
  enemyELITE: { backgroundColor: '#9b59b6', borderRadius: 25, shadowColor: '#9b59b6' },
  enemyTANK: { backgroundColor: '#d35400', borderBottomWidth: 22, borderBottomColor: '#a04000', borderRadius: 8 },
  tankShield: { position: 'absolute', width: 64, height: 12, backgroundColor: '#f1c40f', bottom: -6, borderRadius: 6 },

  boss: { position: 'absolute', width: BOSS_WIDTH, height: BOSS_HEIGHT, justifyContent: 'center', alignItems: 'center', shadowColor: '#9b59b6', shadowRadius: 20, shadowOpacity: 0.8 },
  bossCore: { width: 85, height: 85, backgroundColor: '#8e44ad', borderRadius: 22, borderWidth: 4, borderColor: '#fff', zIndex: 2 },
  bossWingL: { position: 'absolute', left: 0, top: 25, width: 65, height: 45, backgroundColor: '#732d91', borderBottomLeftRadius: 45, zIndex: 1 },
  bossWingR: { position: 'absolute', right: 0, top: 25, width: 65, height: 45, backgroundColor: '#732d91', borderBottomRightRadius: 45, zIndex: 1 },
  bossHpTrack: { position: 'absolute', top: -15, width: '100%', height: 8, backgroundColor: '#333', borderRadius: 4 },
  bossHpBar: { height: '100%', backgroundColor: '#ff3366', borderRadius: 4 },

  powerup: { position: 'absolute', width: POWERUP_SIZE, height: POWERUP_SIZE, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 17, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#fff', shadowRadius: 8, shadowOpacity: 0.6 },
  powerupIcon: { fontSize: 18 },
  coin: { position: 'absolute', width: COIN_SIZE, height: COIN_SIZE, justifyContent: 'center', alignItems: 'center' },
  coinText: { fontSize: 18 },

  floatingText: { position: 'absolute', fontWeight: '900', textShadowColor: '#000', textShadowRadius: 4, fontSize: 16 },
  
  explosionContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  explosionCore: { position: 'absolute', backgroundColor: '#fff', shadowColor: '#ffaa00', shadowRadius: 15, shadowOpacity: 1 },
  explosionRing: { position: 'absolute', borderWidth: 2, borderColor: '#ffaa00' },
  particle: { position: 'absolute', width: 6, height: 6, backgroundColor: '#ff3366', borderRadius: 3 },

  notificationsContainer: { position: 'absolute', top: 100, width: '100%', alignItems: 'center', zIndex: 80 },
  popupBanner: { backgroundColor: '#131836', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 2, alignItems: 'center', marginBottom: 10, shadowRadius: 10, shadowOpacity: 0.8 },
  popupAchieve: { borderColor: '#ffea00', shadowColor: '#ffea00' },
  popupMission: { borderColor: '#00ffcc', shadowColor: '#00ffcc' },
  popupTitle: { color: '#fff', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  popupText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalTitle: { color: '#00ffcc', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 5, letterSpacing: 1 },
  modalSub: { color: '#ffea00', fontSize: 16, textAlign: 'center', marginBottom: 20, fontWeight: '800' },
  scrollArea: { flex: 1, marginBottom: 20, overflow: 'hidden' },
  
  shopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 16, borderRadius: 12, marginBottom: 12 },
  shopItemName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  shopItemLevel: { color: '#00ffcc', fontSize: 13, fontWeight: '700' },
  shopItemDesc: { color: '#aab7c4', fontSize: 12, marginTop: 4, fontWeight: '600' },
  buyBtn: { backgroundColor: '#00ffcc', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  buyBtnDisabled: { backgroundColor: '#444' },
  buyBtnText: { color: '#050a1f', fontWeight: '900', fontSize: 15 },
  closeBtn: { backgroundColor: '#ff3366', padding: 16, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 1 },

  achieveRow: { marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  achieveDone: { backgroundColor: 'rgba(0, 255, 204, 0.15)', borderColor: '#00ffcc', borderWidth: 1 },
  achieveTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  achieveDesc: { color: '#aab7c4', fontSize: 13, marginTop: 2, fontWeight: '600' },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  settingText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  toggleBtn: { backgroundColor: '#444', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 20 },
  toggleOn: { backgroundColor: '#00ffcc' },
  toggleText: { color: '#050a1f', fontWeight: '900' },
  
  instText: { color: '#e2f1ff', fontSize: 17, marginBottom: 16, lineHeight: 26, fontWeight: '600' },

  statsBox: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 25, borderRadius: 18, marginBottom: 35, width: 260, borderWidth: 1, borderColor: '#ff3366' },
  statText: { color: '#aab7c4', fontSize: 15, marginBottom: 10, fontWeight: '600' },
  statValue: { color: '#fff', fontWeight: '900', fontSize: 18 },
});