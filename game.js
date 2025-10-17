// ==========================================
// TESLA TOWER DEFENSE GAME
// VERSION: Save Slots Update v1.0
// ==========================================

class TowerDefenseGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Current save slot (default to slot 1)
        this.currentSlot = parseInt(localStorage.getItem('currentSlot')) || 1;
        
        // Load permanent stats
        this.loadPermanentStats();
        
        // Game state
        this.isPaused = false;
        this.isGameOver = false;
        this.isGameStarted = false;
        this.wave = 1;
        this.kills = 0;
        this.gold = 100;
        
        // Game speed control
        this.gameSpeed = 1; // 1x, 2x, or 4x
        this.speedMultiplier = 1;
        
        // Session stats tracking
        this.sessionDamage = 0;
        this.sessionClicks = 0;
        this.sessionGoldEarned = 0;
        this.sessionBossKills = 0;
        
        // Session zombie type kills
        this.sessionZombieKills = {
            normal: 0,
            strong: 0,
            runner: 0,
            tank: 0,
            exploder: 0,
            spawner: 0,
            boss: 0
        };
        
        // Tower stats (base stats - bonuses will be applied after loading permStats)
        this.tower = {
            x: 0, // Will be set to center
            y: 0, // Will be set to center
            radius: 30,
            health: 100,
            maxHealth: 100,
            level: 1,
            damage: 10,
            range: 150,
            fireRate: 1000, // milliseconds
            lastFire: 0,
            maxTargets: 1, // Start with single target
            chainLightning: 0, // Number of chain jumps (0 = disabled)
            chainRange: 80, // How far lightning can jump to next target
            shield: 0, // Current shield points
            maxShield: 0 // Maximum shield capacity
        };
        
        // Click/Tap damage (base - bonus will be applied after loading permStats)
        this.clickDamage = 5;
        this.isMouseDown = false;
        this.lastClickTime = 0;
        this.clickFireRate = 150; // Random strike spawn rate (150ms)
        this.clickBeams = []; // Store multiple random strikes
        
        // Set canvas size (must be after tower is created)
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
        screen.orientation?.addEventListener('change', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
        
        // Upgrade costs
        this.upgradeCosts = {
            damage: 100,
            range: 80,
            fireRate: 120,
            health: 50,
            targets: 150, // Cost for multi-target upgrade
            clickDamage: 80, // Cost for click damage upgrade
            chainLightning: 200, // Cost for chain lightning upgrade
            shield: 150 // Cost for shield upgrade
        };
        
        // Game objects
        this.zombies = [];
        this.lightning = []; // Lightning effects
        this.particles = []; // Visual effects
        this.damageNumbers = []; // Floating damage numbers
        this.goldCoins = []; // Flying gold coins effect
        this.towerSparks = []; // Electric sparks from tower
        this.impactParticles = []; // Impact burst effects
        
        // Daily Challenges
        this.loadDailyChallenges();
        this.challengeTracking = {
            upgradesUsed: 0,
            clickKills: 0,
            damageTaken: 0
        };
        
        // Leaderboards
        this.loadLeaderboards();
        this.runStartTime = null;
        
        // Spawning
        this.spawnRate = 2000; // Start slow
        this.lastSpawn = 0;
        this.zombiesPerWave = 5;
        this.zombiesSpawned = 0;
        this.bossSpawned = false; // Track if boss spawned this wave
        
        // Narration tracking
        this.criticalHealthWarned = false;
        this.narrationTimeout = null;
        
        // Load settings
        this.loadSettings();
        
        this.init();
    }
    
    resizeCanvas() {
        const header = document.querySelector('.game-header');
        const headerHeight = header ? header.offsetHeight : 0;
        
        // Use available viewport dimensions
        const vw = window.innerWidth || document.documentElement.clientWidth;
        const vh = window.innerHeight || document.documentElement.clientHeight;
        
        this.canvas.width = vw;
        this.canvas.height = vh - headerHeight;
        
        // Update tower position to center
        this.tower.x = this.canvas.width / 2;
        this.tower.y = this.canvas.height / 2;
    }
    
    init() {
        // Apply permanent bonuses now that tower exists
        this.applyPermanentBonuses();
        
        // Apply current theme
        this.applyTheme();
        
        this.setupEventListeners();
        this.setupBackdropCloseListeners();
        this.setupTitleScreen();
        this.updateUI();
        this.gameLoop();
    }
    
    setupTitleScreen() {
        // Check if player name exists
        const playerName = localStorage.getItem('playerName');
        if (playerName) {
            // Player has a name, show main menu
            document.getElementById('titleScreen').classList.remove('active');
            document.getElementById('mainMenu').classList.add('active');
            document.getElementById('currentPlayerName').textContent = `Player: ${playerName}`;
        } else {
            // No player name, show title screen
            document.getElementById('titleScreen').classList.add('active');
            document.getElementById('mainMenu').classList.remove('active');
        }
    }
    
    setupBackdropCloseListeners() {
        // List of all panels that should close on backdrop click
        const panels = [
            { id: 'upgradePanel', backdropId: 'upgradeBackdrop', closeMethod: () => this.closeUpgradePanel() },
            { id: 'permUpgradesPanel', backdropId: 'permUpgradesBackdrop', closeMethod: () => this.closePermUpgradesPanel() },
            { id: 'statsPanel', backdropId: 'statsBackdrop', closeMethod: () => this.closeStatsPanel() },
            { id: 'achievementsPanel', backdropId: 'achievementsBackdrop', closeMethod: () => this.closeAchievementsPanel() },
            { id: 'saveSlotPanel', backdropId: 'saveSlotBackdrop', closeMethod: () => this.closeSaveSlotPanel() },
            { id: 'enemyTypesPanel', backdropId: 'enemyTypesBackdrop', closeMethod: () => this.closeEnemyTypesPanel() },
            { id: 'challengesPanel', backdropId: 'challengesBackdrop', closeMethod: () => this.closeChallengesPanel() },
            { id: 'leaderboardsPanel', backdropId: 'leaderboardsBackdrop', closeMethod: () => this.closeLeaderboardsPanel() },
            { id: 'settingsPanel', backdropId: 'settingsBackdrop', closeMethod: () => this.closeSettingsPanel() }
        ];
        
        panels.forEach(panel => {
            const backdropElement = document.getElementById(panel.backdropId);
            if (backdropElement) {
                backdropElement.addEventListener('click', () => {
                    panel.closeMethod();
                });
            }
        });
    }
    
    setupEventListeners() {
        // Title Screen buttons
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.showNameInput();
        });
        
        document.getElementById('loadGameTitleBtn').addEventListener('click', () => {
            this.openSaveSlotPanel();
        });
        
        document.getElementById('closeGameBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to exit the game?')) {
                window.close();
                // If window.close() doesn't work (some browsers block it), show message
                setTimeout(() => {
                    alert('Please close this tab/window to exit the game.');
                }, 100);
            }
        });
        
        // Name Input buttons
        document.getElementById('confirmNameBtn').addEventListener('click', () => {
            this.confirmPlayerName();
        });
        
        document.getElementById('cancelNameBtn').addEventListener('click', () => {
            this.cancelNameInput();
        });
        
        // Allow Enter key in name input
        document.getElementById('playerNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmPlayerName();
            }
        });
        
        // Logout / New Player button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Start as a new player? This will return you to the title screen.')) {
                localStorage.removeItem('playerName');
                location.reload();
            }
        });
        
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Permanent upgrade purchase buttons (now in gem shop)
        document.getElementById('buyPermDamage').addEventListener('click', () => {
            this.buyPermUpgrade('damage');
        });
        
        document.getElementById('buyPermHealth').addEventListener('click', () => {
            this.buyPermUpgrade('health');
        });
        
        document.getElementById('buyPermClick').addEventListener('click', () => {
            this.buyPermUpgrade('click');
        });
        
        document.getElementById('buyPermGold').addEventListener('click', () => {
            this.buyPermUpgrade('gold');
        });
        
        // Tooltip event listeners for permanent upgrades
        const permUpgradeButtons = [
            { id: 'buyPermDamage', type: 'permDamage' },
            { id: 'buyPermHealth', type: 'permHealth' },
            { id: 'buyPermClick', type: 'permClick' },
            { id: 'buyPermGold', type: 'permGold' }
        ];
        
        permUpgradeButtons.forEach(btn => {
            const element = document.getElementById(btn.id);
            element.addEventListener('mouseenter', () => {
                this.showTooltip(element, btn.type, true);
            });
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
        
        // Stats button
        document.getElementById('statsBtn').addEventListener('click', () => {
            this.openStatsPanel();
        });
        
        document.getElementById('closeStats').addEventListener('click', () => {
            this.closeStatsPanel();
        });
        
        // Gem Shop button
        document.getElementById('gemShopBtn').addEventListener('click', () => {
            this.openGemShopPanel();
        });
        
        document.getElementById('closeGemShop').addEventListener('click', () => {
            this.closeGemShopPanel();
        });
        
        // Gem shop purchase buttons
        document.getElementById('buyGemDamage').addEventListener('click', () => {
            this.buyGemUpgrade('damageMultiplier', 50);
        });
        
        document.getElementById('buyGemHealth').addEventListener('click', () => {
            this.buyGemUpgrade('healthMultiplier', 50);
        });
        
        document.getElementById('buyGemGold').addEventListener('click', () => {
            this.buyGemUpgrade('goldMultiplier', 75);
        });
        
        document.getElementById('buyGemXP').addEventListener('click', () => {
            this.buyGemUpgrade('xpMultiplier', 60);
        });
        
        document.getElementById('buyGemCrit').addEventListener('click', () => {
            this.buyGemUpgrade('critChance', 100);
        });
        
        document.getElementById('buyGemRegen').addEventListener('click', () => {
            this.buyGemUpgrade('healthRegen', 80);
        });
        
        // Daily reward claim button
        document.getElementById('claimRewardBtn').addEventListener('click', () => {
            this.claimDailyReward();
        });
        
        // Themes button
        document.getElementById('themesBtn').addEventListener('click', () => {
            this.openThemesPanel();
        });
        
        document.getElementById('closeThemes').addEventListener('click', () => {
            this.closeThemesPanel();
        });
        
        // Achievements button
        document.getElementById('achievementsBtn').addEventListener('click', () => {
            console.log('Achievements button clicked!');
            this.openAchievementsPanel();
        });
        
        document.getElementById('closeAchievements').addEventListener('click', () => {
            console.log('Close achievements clicked!');
            this.closeAchievementsPanel();
        });
        
        // Enemy Types button
        document.getElementById('enemyTypesBtn').addEventListener('click', () => {
            this.openEnemyTypesPanel();
        });
        
        document.getElementById('enemyTypesUpgradeBtn').addEventListener('click', () => {
            this.openEnemyTypesPanel();
        });
        
        document.getElementById('closeEnemyTypes').addEventListener('click', () => {
            this.closeEnemyTypesPanel();
        });
        
        // Daily Challenges button
        document.getElementById('challengesBtn').addEventListener('click', () => {
            this.openChallengesPanel();
        });
        
        document.getElementById('closeChallenges').addEventListener('click', () => {
            this.closeChallengesPanel();
        });
        
        // Leaderboards button
        document.getElementById('leaderboardsBtn').addEventListener('click', () => {
            this.openLeaderboardsPanel();
        });
        
        document.getElementById('closeLeaderboards').addEventListener('click', () => {
            this.closeLeaderboardsPanel();
        });
        
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsPanel();
        });
        
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettingsPanel();
        });
        
        // Settings controls
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            document.getElementById('volumeValue').textContent = e.target.value + '%';
        });
        
        document.getElementById('soundToggleBtn').addEventListener('click', (e) => {
            const btn = e.target;
            btn.classList.toggle('off');
            btn.textContent = btn.classList.contains('off') ? 'OFF' : 'ON';
        });
        
        document.getElementById('voiceToggleBtn').addEventListener('click', (e) => {
            const btn = e.target;
            btn.classList.toggle('off');
            btn.textContent = btn.classList.contains('off') ? 'OFF' : 'ON';
        });
        
        document.getElementById('particlesToggleBtn').addEventListener('click', (e) => {
            const btn = e.target;
            btn.classList.toggle('off');
            btn.textContent = btn.classList.contains('off') ? 'OFF' : 'ON';
        });
        
        document.getElementById('screenShakeToggleBtn').addEventListener('click', (e) => {
            const btn = e.target;
            btn.classList.toggle('off');
            btn.textContent = btn.classList.contains('off') ? 'OFF' : 'ON';
        });
        
        document.getElementById('applySettingsBtn').addEventListener('click', () => {
            this.applySettings();
        });
        
        // Upgrade button
        document.getElementById('upgradeBtn').addEventListener('click', () => {
            this.openUpgradePanel();
        });
        
        // Close upgrade panel
        document.getElementById('closeUpgrade').addEventListener('click', () => {
            this.closeUpgradePanel();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.closeUpgradePanel();
        });
        
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to quit to the main menu? Your current progress will be lost unless you save first!')) {
                this.backToMainMenu();
            }
        });
        
        // Upgrade buttons
        document.getElementById('upgradeDamage').addEventListener('click', () => {
            this.buyUpgrade('damage');
        });
        
        document.getElementById('upgradeRange').addEventListener('click', () => {
            this.buyUpgrade('range');
        });
        
        document.getElementById('upgradeFireRate').addEventListener('click', () => {
            this.buyUpgrade('fireRate');
        });
        
        document.getElementById('upgradeHealth').addEventListener('click', () => {
            this.buyUpgrade('health');
        });
        
        document.getElementById('upgradeTargets').addEventListener('click', () => {
            this.buyUpgrade('targets');
        });
        
        document.getElementById('upgradeClickDamage').addEventListener('click', () => {
            this.buyUpgrade('clickDamage');
        });
        
        document.getElementById('upgradeChainLightning').addEventListener('click', () => {
            this.buyUpgrade('chainLightning');
        });
        
        document.getElementById('upgradeShield').addEventListener('click', () => {
            this.buyUpgrade('shield');
        });
        
        // Tooltip event listeners for in-game upgrades
        const upgradeButtons = [
            { id: 'upgradeDamage', type: 'damage' },
            { id: 'upgradeRange', type: 'range' },
            { id: 'upgradeFireRate', type: 'fireRate' },
            { id: 'upgradeHealth', type: 'health' },
            { id: 'upgradeTargets', type: 'targets' },
            { id: 'upgradeClickDamage', type: 'clickDamage' },
            { id: 'upgradeChainLightning', type: 'chainLightning' },
            { id: 'upgradeShield', type: 'shield' }
        ];
        
        upgradeButtons.forEach(btn => {
            const element = document.getElementById(btn.id);
            element.addEventListener('mouseenter', () => {
                this.showTooltip(element, btn.type, false);
            });
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
        
        // Canvas mouse events for shooting
        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.currentMouseX = e.clientX;
            this.currentMouseY = e.clientY;
            this.handleCanvasClick(e); // Fire immediately on click
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isMouseDown) {
                this.currentMouseX = e.clientX;
                this.currentMouseY = e.clientY;
            }
        });
        
        // Canvas touch events for shooting
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isMouseDown = true;
            const touch = e.touches[0];
            this.currentMouseX = touch.clientX;
            this.currentMouseY = touch.clientY;
            const clickEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            this.handleCanvasClick(clickEvent);
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.isMouseDown = false;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isMouseDown && e.touches.length > 0) {
                const touch = e.touches[0];
                this.currentMouseX = touch.clientX;
                this.currentMouseY = touch.clientY;
            }
        });
        
        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
        
        // Sound toggle button
        document.getElementById('soundToggle').addEventListener('click', () => {
            this.toggleSound();
        });
        
        // Speed control button
        document.getElementById('speedToggle').addEventListener('click', () => {
            this.cycleGameSpeed();
        });
        
        // Save and Load buttons (open slot panel)
        document.getElementById('saveGameBtn').addEventListener('click', () => {
            console.log('Save button clicked!');
            this.openSaveSlotPanel();
        });
        
        document.getElementById('loadGameBtn').addEventListener('click', () => {
            console.log('Load button clicked!');
            this.openSaveSlotPanel();
        });
        
        document.getElementById('saveGameUpgradeBtn').addEventListener('click', () => {
            console.log('Save upgrade button clicked!');
            this.openSaveSlotPanel();
        });
        
        document.getElementById('loadGameUpgradeBtn').addEventListener('click', () => {
            console.log('Load upgrade button clicked!');
            this.openSaveSlotPanel();
        });
        
        // Save slot panel buttons
        document.getElementById('closeSaveSlots').addEventListener('click', () => {
            this.closeSaveSlotPanel();
        });
        
        // Slot 1 buttons
        document.getElementById('saveSlot1').addEventListener('click', () => {
            this.saveGame(1);
        });
        document.getElementById('loadSlot1').addEventListener('click', () => {
            this.loadGame(1);
            this.closeSaveSlotPanel();
        });
        document.getElementById('deleteSlot1').addEventListener('click', () => {
            if (confirm('Delete save in Slot 1?')) this.deleteSave(1);
        });
        
        // Slot 2 buttons
        document.getElementById('saveSlot2').addEventListener('click', () => {
            this.saveGame(2);
        });
        document.getElementById('loadSlot2').addEventListener('click', () => {
            this.loadGame(2);
            this.closeSaveSlotPanel();
        });
        document.getElementById('deleteSlot2').addEventListener('click', () => {
            if (confirm('Delete save in Slot 2?')) this.deleteSave(2);
        });
        
        // Slot 3 buttons
        document.getElementById('saveSlot3').addEventListener('click', () => {
            this.saveGame(3);
        });
        document.getElementById('loadSlot3').addEventListener('click', () => {
            this.loadGame(3);
            this.closeSaveSlotPanel();
        });
        document.getElementById('deleteSlot3').addEventListener('click', () => {
            if (confirm('Delete save in Slot 3?')) this.deleteSave(3);
        });
        
        // Cheat key for testing: Press '=' to get 500 gems
        document.addEventListener('keydown', (e) => {
            if (e.key === '=') {
                this.permStats.gems += 500;
                this.savePermanentStats();
                this.updateUI();
                this.showMessage('CHEAT: +500 Gems! 💎', '#ff00ff');
                this.playSound('achievement');
                console.log('Cheat activated: +500 gems');
            }
            // Test voice with 'V' key
            if (e.key === 'v' || e.key === 'V') {
                console.log('Voice test triggered');
                this.speak('Voice test. Tower Defense Game. Critical Health Warning!', { rate: 1.0, pitch: 1.0, volume: 1.0 });
            }
        });
    }
    
    startGame() {
        console.log('Game started!');
        this.isGameStarted = true;
        this.isGameOver = false; // Reset game over flag
        this.isPaused = false; // Reset pause flag
        this.lastSpawn = performance.now(); // Initialize spawn timer
        this.runStartTime = Date.now(); // Start run timer
        this.criticalHealthWarned = false; // Reset health warning
        
        // Show daily challenges
        console.log('=== DAILY CHALLENGES ===');
        this.dailyChallenges.forEach(c => {
            const status = c.completed ? '✅ COMPLETE' : '⏳ In Progress';
            console.log(`${status} - ${c.name}: ${c.description} (Reward: +${c.reward} kills)`);
        });
        
        const menu = document.getElementById('mainMenu');
        const upgradeBtn = document.getElementById('upgradeBtn');
        
        console.log('Menu before:', menu.classList.contains('active'));
        console.log('Upgrade button before:', upgradeBtn.classList.contains('active'));
        
        menu.classList.remove('active');
        upgradeBtn.classList.add('active');
        
        console.log('Menu after:', menu.classList.contains('active'));
        console.log('Upgrade button after:', upgradeBtn.classList.contains('active'));
        
        // Show speed control button
        document.getElementById('speedToggle').classList.add('active');
        this.updateSpeedButton();
        
        this.lastFrameTime = performance.now();
    }
    
    openUpgradePanel() {
        this.isPaused = true;
        document.getElementById('upgradeBackdrop').classList.add('active');
        document.getElementById('upgradePanel').classList.add('active');
        this.updateUpgradePanel();
    }
    
    closeUpgradePanel() {
        this.isPaused = false;
        document.getElementById('upgradeBackdrop').classList.remove('active');
        document.getElementById('upgradePanel').classList.remove('active');
    }
    
    backToMainMenu() {
        // Close upgrade panel first
        document.getElementById('upgradeBackdrop').classList.remove('active');
        document.getElementById('upgradePanel').classList.remove('active');
        
        // If game is in progress, save stats first
        if (!this.isGameOver && this.isGameStarted) {
            // Update permanent stats
            this.permStats.totalKills += this.kills;
            this.permStats.totalDamageDealt += this.sessionDamage;
            this.permStats.totalClicks += this.sessionClicks;
            this.permStats.totalGoldEarned += this.sessionGoldEarned;
            this.permStats.bossesKilled += this.sessionBossKills;
            this.permStats.totalGamesPlayed++;
            
            // Update zombie type kills
            for (let type in this.sessionZombieKills) {
                this.permStats.zombieKills[type] += this.sessionZombieKills[type];
            }
            
            // Track highest wave
            if (this.wave > this.permStats.highestWave) {
                this.permStats.highestWave = this.wave;
            }
            
            this.savePermanentStats();
            this.checkAchievements();
            this.checkDailyChallenges();
            this.updateLeaderboards();
        }
        
        // Reset the entire game state (similar to restart but stay on menu)
        this.wave = 1;
        this.kills = 0;
        this.zombies = [];
        this.lightning = [];
        this.particles = [];
        this.damageNumbers = [];
        this.goldCoins = [];
        this.towerSparks = [];
        this.impactParticles = [];
        this.zombiesSpawned = 0;
        this.spawnRate = 2000;
        this.bossSpawned = false;
        
        // Reset session stats
        this.sessionDamage = 0;
        this.sessionClicks = 0;
        this.sessionGoldEarned = 0;
        this.sessionBossKills = 0;
        this.sessionZombieKills = {
            normal: 0,
            strong: 0,
            runner: 0,
            tank: 0,
            exploder: 0,
            spawner: 0,
            boss: 0
        };
        
        // Reset challenge tracking
        this.challengeTracking = {
            upgradesUsed: 0,
            clickKills: 0,
            damageTaken: 0
        };
        
        // Reset tower to base + permanent bonuses
        this.tower.level = 1;
        this.tower.range = 150;
        this.tower.fireRate = 1000;
        this.tower.maxTargets = 1;
        this.tower.chainLightning = 0;
        this.tower.shield = 0;
        this.tower.maxShield = 0;
        this.applyPermanentBonuses();
        
        // Reset upgrade costs
        this.upgradeCosts = { 
            damage: 100, 
            range: 80, 
            fireRate: 120, 
            health: 50, 
            targets: 150, 
            clickDamage: 80, 
            chainLightning: 200, 
            shield: 150 
        };
        
        // Reset game state flags
        this.isGameStarted = false;
        this.isGameOver = false;
        this.isPaused = false;
        
        // Reset game speed
        this.gameSpeed = 1;
        this.speedMultiplier = 1;
        
        // Hide upgrade button and speed button, show main menu
        document.getElementById('upgradeBtn').classList.remove('active');
        document.getElementById('speedToggle').classList.remove('active');
        document.getElementById('mainMenu').classList.add('active');
        document.getElementById('gameOver').classList.remove('active');
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update UI
        this.updateUI();
    }
    
    handleCanvasClick(e) {
        // Don't process clicks if game is paused or not started
        if (this.isPaused || !this.isGameStarted || this.isGameOver) return;
        
        // Track click
        this.sessionClicks++;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Create a random lightning strike near the cursor
        const randomOffset = 50; // Strikes appear within 50px of cursor
        const strikeX = x + (Math.random() - 0.5) * randomOffset * 2;
        const strikeY = y + (Math.random() - 0.5) * randomOffset * 2;
        
        // Create new lightning strike
        this.lightning.push({
            x1: this.tower.x,
            y1: this.tower.y,
            x2: strikeX,
            y2: strikeY,
            life: 8, // Short life for quick flash
            isClick: true,
            isContinuous: false
        });
        
        // Add to clickBeams array for tracking
        this.clickBeams.push({
            x: strikeX,
            y: strikeY,
            createdAt: Date.now()
        });
        
        // Clean up old strikes (older than 200ms)
        this.clickBeams = this.clickBeams.filter(beam => Date.now() - beam.createdAt < 200);
        
        // Play lightning sound
        this.playSound('lightning');
        
        // Create small yellow splash at strike location
        this.createParticles(strikeX, strikeY, '#ffff00', 3);
        
        // Check if strike hit any zombie and deal damage
        let hitZombie = false;
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            const dx = strikeX - zombie.x;
            const dy = strikeY - zombie.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if strike is within zombie radius (30px for random strikes)
            if (distance <= 30) {
                // Deal click damage
                zombie.health -= this.clickDamage;
                
                // Track if killed by click
                if (zombie.health <= 0) {
                    this.challengeTracking.clickKills++;
                }
                
                // Track damage dealt
                this.sessionDamage += this.clickDamage;
                
                // Create floating damage number
                this.createDamageNumber(zombie.x, zombie.y - 20, this.clickDamage);
                
                // Create red blood splash at zombie location
                this.createParticles(zombie.x, zombie.y, '#ff0000', 4);
                
                // Play hit sound
                this.playSound('zombieHit');
                
                hitZombie = true;
                
                break; // Only hit one zombie per click
            }
        }
    }
    
    handleContinuousShooting(currentTime) {
        // If mouse/finger is down and enough time has passed, shoot again
        if (this.isMouseDown && this.isGameStarted && !this.isPaused && !this.isGameOver) {
            if (currentTime - this.lastClickTime >= this.clickFireRate) {
                // Fire at current mouse/touch position
                const clickEvent = {
                    clientX: this.currentMouseX,
                    clientY: this.currentMouseY
                };
                this.handleCanvasClick(clickEvent);
                this.lastClickTime = currentTime;
            }
        }
    }
    
    buyUpgrade(type) {
        const cost = this.upgradeCosts[type];
        
        // Check if can afford
        if (this.gold < cost) {
            this.showMessage('Not enough gold!', '#ff4444');
            return;
        }
        
        // Check if health upgrade when already at max
        if (type === 'health' && this.tower.health >= this.tower.maxHealth) {
            this.showMessage('Tower at full health!', '#ffff00');
            return;
        }
        
        this.gold -= cost;
        
        // Track upgrades for daily challenges
        this.challengeTracking.upgradesUsed++;
        
        switch(type) {
            case 'damage':
                this.tower.damage += 5;
                this.upgradeCosts.damage = Math.floor(this.upgradeCosts.damage * 1.5);
                break;
            case 'range':
                this.tower.range += 30;
                this.upgradeCosts.range = Math.floor(this.upgradeCosts.range * 1.5);
                break;
            case 'fireRate':
                this.tower.fireRate = Math.max(200, this.tower.fireRate - 100);
                this.upgradeCosts.fireRate = Math.floor(this.upgradeCosts.fireRate * 1.5);
                break;
            case 'health':
                this.tower.health = Math.min(this.tower.maxHealth, this.tower.health + 50);
                break;
            case 'targets':
                this.tower.maxTargets += 1;
                this.upgradeCosts.targets = Math.floor(this.upgradeCosts.targets * 1.5);
                break;
            case 'clickDamage':
                this.clickDamage += 2;
                this.upgradeCosts.clickDamage = Math.floor(this.upgradeCosts.clickDamage * 1.5);
                break;
            case 'chainLightning':
                this.tower.chainLightning += 1;
                this.upgradeCosts.chainLightning = Math.floor(this.upgradeCosts.chainLightning * 1.5);
                break;
            case 'shield':
                this.tower.maxShield += 5;
                this.tower.shield = this.tower.maxShield; // Fully charge shield
                this.upgradeCosts.shield = Math.floor(this.upgradeCosts.shield * 1.5);
                break;
        }
        
        this.tower.level++;
        this.updateUI();
        this.updateUpgradePanel();
        this.playSound('upgrade');
        this.showMessage('Upgrade purchased!', '#00ffff');
    }
    
    updateUpgradePanel() {
        document.getElementById('currentGold').textContent = this.gold;
        document.getElementById('towerLevel').textContent = this.tower.level;
        document.getElementById('towerDamage').textContent = this.tower.damage;
        document.getElementById('towerRange').textContent = this.tower.range;
        document.getElementById('towerFireRate').textContent = (this.tower.fireRate / 1000).toFixed(1) + 's';
        document.getElementById('towerTargets').textContent = this.tower.maxTargets;
        document.getElementById('towerClickDamage').textContent = this.clickDamage;
        document.getElementById('towerChainLightning').textContent = this.tower.chainLightning;
        document.getElementById('currentChainJumps').textContent = this.tower.chainLightning;
        document.getElementById('towerShield').textContent = this.tower.shield + '/' + this.tower.maxShield;
        document.getElementById('currentShield').textContent = this.tower.maxShield;
        
        document.getElementById('damageCost').textContent = this.upgradeCosts.damage;
        document.getElementById('rangeCost').textContent = this.upgradeCosts.range;
        document.getElementById('fireRateCost').textContent = this.upgradeCosts.fireRate;
        document.getElementById('healthCost').textContent = this.upgradeCosts.health;
        document.getElementById('targetsCost').textContent = this.upgradeCosts.targets;
        document.getElementById('clickDamageCost').textContent = this.upgradeCosts.clickDamage;
        document.getElementById('chainLightningCost').textContent = this.upgradeCosts.chainLightning;
        document.getElementById('shieldCost').textContent = this.upgradeCosts.shield;
        
        // Disable buttons if not enough gold
        const upgrades = ['damage', 'range', 'fireRate', 'health', 'targets', 'clickDamage', 'chainLightning', 'shield'];
        upgrades.forEach(type => {
            // Handle special capitalization cases
            let btnId;
            if (type === 'fireRate') {
                btnId = 'upgradeFireRate';
            } else if (type === 'clickDamage') {
                btnId = 'upgradeClickDamage';
            } else if (type === 'chainLightning') {
                btnId = 'upgradeChainLightning';
            } else {
                btnId = `upgrade${type.charAt(0).toUpperCase() + type.slice(1)}`;
            }
            
            const btn = document.getElementById(btnId);
            if (!btn) return; // Skip if button doesn't exist
            
            const cost = this.upgradeCosts[type];
            if (this.gold < cost || (type === 'health' && this.tower.health >= this.tower.maxHealth)) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }
    
    spawnZombie() {
        // Check if this is a boss wave (every 5 waves) and boss hasn't spawned yet
        const isBossWave = this.wave % 5 === 0;
        const spawnBoss = isBossWave && !this.bossSpawned;
        
        // Spawn from random edge
        const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        let x, y;
        
        switch(side) {
            case 0: // top
                x = Math.random() * this.canvas.width;
                y = -50;
                break;
            case 1: // right
                x = this.canvas.width + 50;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 50;
                break;
            case 3: // left
                x = -50;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        let zombie;
        
        if (spawnBoss) {
            // Boss Zombie
            zombie = {
                x: x,
                y: y,
                type: 'boss',
                radius: 30,
                health: 100 + this.wave * 20,
                maxHealth: 100 + this.wave * 20,
                speed: 0.3,
                goldValue: 100 + this.wave * 10,
                lastDamageTime: 0,
                damageRate: 1000,
                damage: 2,
                color: '#ff0000',
                emoji: '👑',
                isBoss: true
            };
            this.bossSpawned = true;
            this.playSound('boss');
            this.showMessage('💀 BOSS ZOMBIE INCOMING! 💀', '#ff0000');
            this.showNarration('💀 BOSS APPROACHING! 💀', 3000);
        } else {
            // Determine zombie type based on wave and random chance
            const rand = Math.random();
            let zombieType;
            
            if (this.wave >= 15 && rand < 0.15) {
                zombieType = 'exploder';
            } else if (this.wave >= 12 && rand < 0.2) {
                zombieType = 'spawner';
            } else if (this.wave >= 10 && rand < 0.3) {
                zombieType = 'tank';
            } else if (this.wave >= 7 && rand < 0.4) {
                zombieType = 'runner';
            } else if (this.wave >= 3 && rand < 0.55) {
                zombieType = 'strong';
            } else {
                zombieType = 'normal';
            }
            
            // Create zombie based on type
            switch(zombieType) {
                case 'normal':
                    // Regular Zombie - Balanced stats
                    zombie = {
                        x: x,
                        y: y,
                        type: 'normal',
                        radius: 15,
                        health: 20 + this.wave * 5,
                        maxHealth: 20 + this.wave * 5,
                        speed: 0.5 + this.wave * 0.05,
                        goldValue: 10 + this.wave,
                        lastDamageTime: 0,
                        damageRate: 1000,
                        damage: 1,
                        color: '#00ff00',
                        emoji: '🧟',
                        isBoss: false
                    };
                    break;
                    
                case 'strong':
                    // Strong Zombie - More health, slower
                    zombie = {
                        x: x,
                        y: y,
                        type: 'strong',
                        radius: 18,
                        health: 40 + this.wave * 8,
                        maxHealth: 40 + this.wave * 8,
                        speed: 0.3 + this.wave * 0.03,
                        goldValue: 15 + this.wave * 1.5,
                        lastDamageTime: 0,
                        damageRate: 1000,
                        damage: 2,
                        color: '#ffaa00',
                        emoji: '🧟‍♂️',
                        isBoss: false
                    };
                    break;
                    
                case 'runner':
                    // Fast Zombie - Low health, very fast
                    zombie = {
                        x: x,
                        y: y,
                        type: 'runner',
                        radius: 12,
                        health: 10 + this.wave * 3,
                        maxHealth: 10 + this.wave * 3,
                        speed: 1.2 + this.wave * 0.1,
                        goldValue: 12 + this.wave,
                        lastDamageTime: 0,
                        damageRate: 800,
                        damage: 1,
                        color: '#00ffff',
                        emoji: '🏃',
                        isBoss: false
                    };
                    break;
                    
                case 'tank':
                    // Tank Zombie - Very high health, very slow
                    zombie = {
                        x: x,
                        y: y,
                        type: 'tank',
                        radius: 22,
                        health: 80 + this.wave * 15,
                        maxHealth: 80 + this.wave * 15,
                        speed: 0.2 + this.wave * 0.02,
                        goldValue: 25 + this.wave * 2,
                        lastDamageTime: 0,
                        damageRate: 1200,
                        damage: 3,
                        color: '#888888',
                        emoji: '🛡️',
                        isBoss: false
                    };
                    break;
                    
                case 'exploder':
                    // Exploder Zombie - Explodes on death, damaging tower
                    zombie = {
                        x: x,
                        y: y,
                        type: 'exploder',
                        radius: 16,
                        health: 25 + this.wave * 4,
                        maxHealth: 25 + this.wave * 4,
                        speed: 0.6 + this.wave * 0.06,
                        goldValue: 20 + this.wave * 1.5,
                        lastDamageTime: 0,
                        damageRate: 1000,
                        damage: 1,
                        color: '#ff00ff',
                        emoji: '💣',
                        isBoss: false,
                        isExploder: true
                    };
                    break;
                    
                case 'spawner':
                    // Spawner Zombie - Splits into 2 smaller zombies on death
                    zombie = {
                        x: x,
                        y: y,
                        type: 'spawner',
                        radius: 20,
                        health: 35 + this.wave * 6,
                        maxHealth: 35 + this.wave * 6,
                        speed: 0.4 + this.wave * 0.04,
                        goldValue: 18 + this.wave * 1.5,
                        lastDamageTime: 0,
                        damageRate: 1000,
                        damage: 2,
                        color: '#00ff88',
                        emoji: '👥',
                        isBoss: false,
                        isSpawner: true
                    };
                    break;
            }
        }
        
        this.zombies.push(zombie);
    }
    
    updateZombies(deltaTime) {
        const currentTime = performance.now();
        
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            
            // Move towards tower
            const dx = this.tower.x - zombie.x;
            const dy = this.tower.y - zombie.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.tower.radius + zombie.radius) {
                // Zombie hasn't reached tower yet - keep moving
                zombie.x += (dx / distance) * zombie.speed * deltaTime / 16;
                zombie.y += (dy / distance) * zombie.speed * deltaTime / 16;
            } else {
                // Zombie reached tower - damage it periodically!
                if (currentTime - zombie.lastDamageTime >= zombie.damageRate) {
                    const zombieDamage = zombie.damage || 1;
                    // Shield absorbs damage first
                    if (this.tower.shield > 0) {
                        this.tower.shield = Math.max(0, this.tower.shield - zombieDamage);
                        // Create blue shield particle effect
                        this.createParticles(zombie.x, zombie.y, '#00ddff', 3);
                    } else {
                        this.tower.health -= zombieDamage;
                        this.challengeTracking.damageTaken += zombieDamage;
                        // Create red damage particle effect
                        this.createParticles(zombie.x, zombie.y, '#ff0000', 3);
                        
                        // Check for critical health warning
                        const healthPercent = this.tower.health / this.tower.maxHealth;
                        if (healthPercent <= 0.25 && !this.criticalHealthWarned) {
                            this.showNarration('⚠️ TOWER CRITICAL! ⚠️', 3000);
                            this.criticalHealthWarned = true;
                        }
                    }
                    zombie.lastDamageTime = currentTime;
                    
                    if (this.tower.health <= 0) {
                        this.gameOver();
                    }
                }
                // Zombie stays at the tower and doesn't die
            }
            
            // Remove dead zombies
            if (zombie.health <= 0) {
                // Apply XP multiplier to kills
                const killsGained = Math.floor(1 * (this.xpMultiplier || 1));
                this.kills += killsGained;
                
                // Apply gold multiplier
                const goldGained = Math.floor(zombie.goldValue * (this.goldMultiplier || 1));
                this.gold += goldGained;
                this.sessionGoldEarned += goldGained;
                
                // Create flying gold coin
                const goldEl = document.getElementById('gold');
                if (goldEl) {
                    const rect = goldEl.getBoundingClientRect();
                    const targetX = rect.left + rect.width / 2;
                    const targetY = rect.top + rect.height / 2;
                    const midX = (zombie.x + targetX) / 2;
                    const midY = Math.min(zombie.y, targetY) - 100;
                    this.goldCoins.push({
                        x: zombie.x,
                        y: zombie.y,
                        startX: zombie.x,
                        startY: zombie.y,
                        midX: midX,
                        midY: midY,
                        targetX: targetX,
                        targetY: targetY,
                        progress: 0,
                        size: Math.min(zombie.goldValue / 5, 8) + 3
                    });
                }
                
                // Track zombie type kills
                if (zombie.type) {
                    this.sessionZombieKills[zombie.type]++;
                }
                
                // Track boss kills
                if (zombie.isBoss) {
                    this.sessionBossKills++;
                }
                
                // Exploder zombie deals damage to tower on death
                if (zombie.isExploder) {
                    const explosionDamage = 5 + Math.floor(this.wave / 2);
                    const dist = Math.sqrt((zombie.x - this.tower.x) ** 2 + (zombie.y - this.tower.y) ** 2);
                    
                    // Only explode if within 200 pixels of tower
                    if (dist < 200) {
                        if (this.tower.shield > 0) {
                            this.tower.shield = Math.max(0, this.tower.shield - explosionDamage);
                        } else {
                            this.tower.health -= explosionDamage;
                        }
                        this.showMessage(`💥 EXPLOSION! -${explosionDamage} HP`, '#ff00ff');
                        // Large purple explosion particles
                        this.createParticles(zombie.x, zombie.y, '#ff00ff', 15);
                    } else {
                        // Small explosion even if far away
                        this.createParticles(zombie.x, zombie.y, '#ff00ff', 8);
                    }
                } else if (zombie.isSpawner) {
                    // Spawner zombie splits into 2 smaller zombies on death
                    this.showMessage('👥 SPAWNER SPLIT!', '#00ff88');
                    this.createParticles(zombie.x, zombie.y, '#00ff88', 12);
                    
                    // Spawn 2 smaller zombies at the death location
                    for (let j = 0; j < 2; j++) {
                        const angleOffset = (j === 0 ? -0.5 : 0.5);
                        const spawnX = zombie.x + Math.cos(angleOffset) * 30;
                        const spawnY = zombie.y + Math.sin(angleOffset) * 30;
                        
                        this.zombies.push({
                            x: spawnX,
                            y: spawnY,
                            type: 'normal',
                            radius: 12,
                            health: 15 + this.wave * 3,
                            maxHealth: 15 + this.wave * 3,
                            speed: 0.7 + this.wave * 0.06,
                            goldValue: 8 + this.wave,
                            lastDamageTime: 0,
                            damageRate: 1000,
                            damage: 1,
                            color: '#00ff88',
                            emoji: '🧟',
                            isBoss: false,
                            isSpawn: true
                        });
                    }
                } else {
                    // Red blood splash when zombie dies
                    this.createParticles(zombie.x, zombie.y, '#ff0000', 5);
                }
                
                // Play death and gold sounds
                this.playSound('zombieDeath');
                this.playSound('gold');
                
                this.zombies.splice(i, 1);
            }
        }
    }
    
    towerAttack(currentTime) {
        if (currentTime - this.tower.lastFire < this.tower.fireRate) return;
        
        // Find zombies in range
        const targets = this.zombies.filter(zombie => {
            const dx = zombie.x - this.tower.x;
            const dy = zombie.y - this.tower.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= this.tower.range;
        });
        
        if (targets.length > 0) {
            // Create electric sparks around tower
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i / 6) + Math.random() * 0.5;
                const dist = this.tower.radius + 10 + Math.random() * 15;
                this.towerSparks.push({
                    x: this.tower.x + Math.cos(angle) * dist,
                    y: this.tower.y + Math.sin(angle) * dist,
                    vx: Math.cos(angle) * 2,
                    vy: Math.sin(angle) * 2,
                    life: 300,
                    size: Math.random() * 2 + 1,
                    color: Math.random() > 0.5 ? '#00ffff' : '#ffffff'
                });
            }
            
            // Attack up to maxTargets closest zombies with tesla effect
            const sorted = targets.sort((a, b) => {
                const distA = Math.sqrt((a.x - this.tower.x) ** 2 + (a.y - this.tower.y) ** 2);
                const distB = Math.sqrt((b.x - this.tower.x) ** 2 + (b.y - this.tower.y) ** 2);
                return distA - distB;
            });
            
            const attackCount = Math.min(this.tower.maxTargets, sorted.length);
            for (let i = 0; i < attackCount; i++) {
                const target = sorted[i];
                
                // Attack primary target and handle chain lightning
                this.attackTargetWithChain(target, this.tower.x, this.tower.y, []);
            }
            
            this.tower.lastFire = currentTime;
        }
    }
    
    attackTargetWithChain(target, fromX, fromY, hitTargets, chainCount = 0) {
        // Prevent hitting the same zombie twice
        if (hitTargets.includes(target)) return;
        
        // Check for critical strike
        const isCrit = Math.random() < (this.critChance || 0);
        const damageDealt = isCrit ? Math.floor(this.tower.damage * 2) : this.tower.damage;
        
        // Deal damage to current target
        target.health -= damageDealt;
        hitTargets.push(target);
        
        // Track damage dealt
        this.sessionDamage += damageDealt;
        
        // Create floating damage number (yellow for crits)
        this.createDamageNumber(target.x, target.y - 20, damageDealt, isCrit);
        
        // Create lightning effect from source to target
        this.lightning.push({
            x1: fromX,
            y1: fromY,
            x2: target.x,
            y2: target.y,
            life: 200, // milliseconds
            isChain: chainCount > 0 // Mark chain lightning for different effect
        });
        
        // Create impact effect
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i / 8);
            const speed = Math.random() * 3 + 2;
            this.impactParticles.push({
                x: target.x,
                y: target.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 400,
                color: Math.random() > 0.5 ? '#ffff00' : '#ffffff',
                radius: Math.random() * 2 + 1
            });
        }
        
        // Create small cyan splash where tower attack lands
        this.createParticles(target.x, target.y, '#00ffff', 3);
        
        // If zombie is killed, add red blood splash
        if (target.health <= 0) {
            this.createParticles(target.x, target.y, '#ff0000', 4);
        }
        
        // Chain lightning logic
        if (chainCount < this.tower.chainLightning) {
            // Find nearby zombies that haven't been hit
            const nearbyTargets = this.zombies.filter(zombie => {
                if (hitTargets.includes(zombie)) return false;
                
                const dx = zombie.x - target.x;
                const dy = zombie.y - target.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance <= this.tower.chainRange;
            });
            
            if (nearbyTargets.length > 0) {
                // Find closest nearby zombie
                const nextTarget = nearbyTargets.sort((a, b) => {
                    const distA = Math.sqrt((a.x - target.x) ** 2 + (a.y - target.y) ** 2);
                    const distB = Math.sqrt((b.x - target.x) ** 2 + (b.y - target.y) ** 2);
                    return distA - distB;
                })[0];
                
                // Chain to next target
                this.attackTargetWithChain(nextTarget, target.x, target.y, hitTargets, chainCount + 1);
            }
        }
    }
    
    createParticles(x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 400, // Shorter life for smaller effect
                color: color,
                radius: Math.random() * 2 + 1 // Smaller particles
            });
        }
    }
    
    createDamageNumber(x, y, damage, isCrit = false) {
        this.damageNumbers.push({
            x: x,
            y: y,
            damage: damage,
            life: 800, // How long it lasts (ms)
            vy: -1.5, // Float upward speed
            isCrit: isCrit // Mark as critical hit
        });
    }
    
    updateDamageNumbers(deltaTime) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.y += dn.vy;
            dn.life -= deltaTime;
            
            if (dn.life <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateLightning(deltaTime) {
        for (let i = this.lightning.length - 1; i >= 0; i--) {
            this.lightning[i].life -= deltaTime;
            if (this.lightning[i].life <= 0) {
                this.lightning.splice(i, 1);
            }
        }
    }
    
    updateTowerSparks(deltaTime) {
        for (let i = this.towerSparks.length - 1; i >= 0; i--) {
            const spark = this.towerSparks[i];
            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.life -= deltaTime;
            if (spark.life <= 0) {
                this.towerSparks.splice(i, 1);
            }
        }
    }
    
    updateImpactParticles(deltaTime) {
        for (let i = this.impactParticles.length - 1; i >= 0; i--) {
            const p = this.impactParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= deltaTime;
            if (p.life <= 0) {
                this.impactParticles.splice(i, 1);
            }
        }
    }
    
    updateGoldCoins(deltaTime) {
        for (let i = this.goldCoins.length - 1; i >= 0; i--) {
            const coin = this.goldCoins[i];
            coin.progress += 0.02;
            if (coin.progress >= 1) {
                this.goldCoins.splice(i, 1);
            } else {
                const t = coin.progress;
                const invT = 1 - t;
                coin.x = invT * invT * coin.startX + 2 * invT * t * coin.midX + t * t * coin.targetX;
                coin.y = invT * invT * coin.startY + 2 * invT * t * coin.midY + t * t * coin.targetY;
            }
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw range indicator
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.tower.x, this.tower.y, this.tower.range, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw tower
        const healthPercent = Math.min(1, Math.max(0, this.tower.health / this.tower.maxHealth));
        const gradient = this.ctx.createRadialGradient(
            this.tower.x, this.tower.y, 0,
            this.tower.x, this.tower.y, this.tower.radius
        );
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(1, '#0088ff');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.tower.x, this.tower.y, this.tower.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw shield if active
        if (this.tower.shield > 0) {
            const shieldAlpha = 0.3 + (this.tower.shield / this.tower.maxShield) * 0.4;
            this.ctx.strokeStyle = `rgba(0, 221, 255, ${shieldAlpha})`;
            this.ctx.lineWidth = 4;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00ddff';
            this.ctx.beginPath();
            this.ctx.arc(this.tower.x, this.tower.y, this.tower.radius + 10, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            this.ctx.lineWidth = 1;
        }
        
        // Tower health bar (fixed width)
        const barWidth = 60;
        const barHeight = 8;
        
        // Background bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.tower.x - barWidth/2, this.tower.y - this.tower.radius - 15, barWidth, barHeight);
        
        // Health fill (clamped to prevent overflow)
        const healthBarWidth = Math.min(barWidth, barWidth * healthPercent);
        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : (healthPercent > 0.25 ? '#ffff00' : '#ff0000');
        this.ctx.fillRect(this.tower.x - barWidth/2, this.tower.y - this.tower.radius - 15, healthBarWidth, barHeight);
        
        // Shield bar (if shield exists)
        if (this.tower.maxShield > 0) {
            const shieldPercent = Math.min(1, Math.max(0, this.tower.shield / this.tower.maxShield));
            const shieldBarWidth = Math.min(barWidth, barWidth * shieldPercent);
            
            // Background
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(this.tower.x - barWidth/2, this.tower.y - this.tower.radius - 28, barWidth, barHeight);
            
            // Shield fill
            this.ctx.fillStyle = '#00ddff';
            this.ctx.fillRect(this.tower.x - barWidth/2, this.tower.y - this.tower.radius - 28, shieldBarWidth, barHeight);
        }
        
        // Draw lightning effects
        this.lightning.forEach(bolt => {
            // Different color for click lightning
            if (bolt.isClick) {
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.shadowColor = '#ffff00';
            } else {
                this.ctx.strokeStyle = '#00ffff';
                this.ctx.shadowColor = '#00ffff';
            }
            
            // All lightning bolts use the same erratic style
            this.ctx.lineWidth = 3;
            this.ctx.shadowBlur = 20;
            
            this.ctx.beginPath();
            this.ctx.moveTo(bolt.x1, bolt.y1);
            
            // Erratic lightning strike with sharp angles and varying offsets
            const segments = 6 + Math.floor(Math.random() * 4); // Random 6-10 segments
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                // Large, sporadic random offsets that vary in intensity
                const intensity = 20 + Math.random() * 30; // Random intensity per segment
                const x = bolt.x1 + (bolt.x2 - bolt.x1) * t + (Math.random() - 0.5) * intensity;
                const y = bolt.y1 + (bolt.y2 - bolt.y1) * t + (Math.random() - 0.5) * intensity;
                this.ctx.lineTo(x, y);
            }
            this.ctx.lineTo(bolt.x2, bolt.y2);
            this.ctx.stroke();
            
            // Add random branches for more lightning-like effect
            if (Math.random() < 0.3) {
                const branchStart = Math.floor(Math.random() * segments);
                const t = branchStart / segments;
                const branchX = bolt.x1 + (bolt.x2 - bolt.x1) * t + (Math.random() - 0.5) * 30;
                const branchY = bolt.y1 + (bolt.y2 - bolt.y1) * t + (Math.random() - 0.5) * 30;
                const branchEndX = branchX + (Math.random() - 0.5) * 80;
                const branchEndY = branchY + (Math.random() - 0.5) * 80;
                
                this.ctx.beginPath();
                this.ctx.moveTo(branchX, branchY);
                this.ctx.lineTo(branchEndX, branchEndY);
                this.ctx.stroke();
            }
        });
        
        this.ctx.shadowBlur = 0;
        
        // Draw zombies
        this.zombies.forEach(zombie => {
            // Zombie body with type-specific color and glow effect
            this.ctx.fillStyle = zombie.color || '#4a4';
            
            // Add glow effect for special zombies
            if (zombie.isBoss || zombie.type === 'exploder' || zombie.type === 'tank') {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = zombie.color;
            }
            
            this.ctx.beginPath();
            this.ctx.arc(zombie.x, zombie.y, zombie.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Zombie health bar
            const zhealthPercent = zombie.health / zombie.maxHealth;
            const zbarWidth = zombie.radius * 2;
            const zbarHeight = 4;
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(zombie.x - zbarWidth/2, zombie.y - zombie.radius - 10, zbarWidth, zbarHeight);
            
            // Health bar color based on type
            let healthBarColor = '#ff0000';
            if (zombie.health > zombie.maxHealth * 0.66) healthBarColor = '#00ff00';
            else if (zombie.health > zombie.maxHealth * 0.33) healthBarColor = '#ffff00';
            
            this.ctx.fillStyle = healthBarColor;
            this.ctx.fillRect(zombie.x - zbarWidth/2, zombie.y - zombie.radius - 10, zbarWidth * zhealthPercent, zbarHeight);
        });
        
        // Draw particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 1000;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw damage numbers
        this.damageNumbers.forEach(dn => {
            const alpha = dn.life / 800;
            this.ctx.globalAlpha = alpha;
            
            // Different style for critical hits
            if (dn.isCrit) {
                this.ctx.font = 'bold 24px Arial';
                this.ctx.fillStyle = '#ff0000';
                this.ctx.shadowColor = '#ff0000';
                this.ctx.shadowBlur = 10;
            } else {
                this.ctx.font = 'bold 18px Arial';
                this.ctx.fillStyle = '#ffff00';
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            this.ctx.textAlign = 'center';
            this.ctx.strokeText(dn.isCrit ? `CRIT! ${dn.damage}` : dn.damage, dn.x, dn.y);
            this.ctx.fillText(dn.isCrit ? `CRIT! ${dn.damage}` : dn.damage, dn.x, dn.y);
            this.ctx.globalAlpha = 1;
            this.ctx.shadowBlur = 0;
        });
        
        // Draw tower sparks
        this.towerSparks.forEach(s => {
            this.ctx.fillStyle = s.color;
            this.ctx.globalAlpha = s.life / 300;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw impact particles
        this.impactParticles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 400;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw gold coins
        this.goldCoins.forEach(coin => {
            const alpha = coin.progress < 0.9 ? 1 : (1 - coin.progress) * 10;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#ffed4e';
            this.ctx.beginPath();
            this.ctx.arc(coin.x - coin.size/3, coin.y - coin.size/3, coin.size/2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
    }
    
    updateUI() {
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('kills').textContent = this.kills;
        document.getElementById('gold').textContent = this.gold;
        document.getElementById('towerHealth').textContent = Math.max(0, Math.floor(this.tower.health));
        
        // Update player name display
        const playerName = localStorage.getItem('playerName') || 'Guest';
        const playerNameElement = document.getElementById('currentPlayerName');
        if (playerNameElement) {
            playerNameElement.textContent = `Player: ${playerName}`;
        }
        
        // Update gems display
        const gemsElement = document.getElementById('gemsAmount');
        if (gemsElement && this.permStats) {
            gemsElement.textContent = this.permStats.gems || 0;
        }
    }
    
    showMessage(text, color) {
        // Could add a toast notification here
        console.log(text);
    }
    
    showNarration(text, duration = 2500) {
        // Just play sound and speak - no visual popup
        this.playSound('powerUp');
        
        // Speak the narration (remove emojis for cleaner speech)
        const cleanText = text.replace(/[⚡💀⚠️🏆✓]/g, '').trim();
        
        // Adjust speech based on message type - slower rates sound more natural
        if (text.includes('BOSS')) {
            this.speak(cleanText, { rate: 0.85, pitch: 0.9, volume: 1.0 }); // Slower, slightly deeper
        } else if (text.includes('CRITICAL')) {
            this.speak(cleanText, { rate: 1.0, pitch: 1.1, volume: 1.0 }); // Normal speed, slightly higher
        } else if (text.includes('ACHIEVEMENT')) {
            this.speak(cleanText, { rate: 0.95, pitch: 1.05, volume: 1.0 }); // Slightly slower for clarity
        } else {
            this.speak(cleanText, { rate: 0.9, pitch: 1.0, volume: 1.0 }); // Slightly slower than default
        }
    }
    
    // Tooltip System
    showTooltip(element, upgradeType, isPermanent = false) {
        const tooltip = document.getElementById('tooltipDisplay');
        const tooltipTitle = document.getElementById('tooltipTitle');
        const tooltipContent = document.getElementById('tooltipContent');
        
        if (!tooltip || !tooltipTitle || !tooltipContent) return;
        
        // Get tooltip data
        const data = this.getTooltipData(upgradeType, isPermanent);
        if (!data) return;
        
        // Set tooltip content
        tooltipTitle.textContent = data.title;
        tooltipContent.innerHTML = data.content;
        
        // Position tooltip near the element
        const rect = element.getBoundingClientRect();
        const tooltipWidth = 300;
        const tooltipHeight = 150;
        
        // Position to the right if there's space, otherwise to the left
        let left = rect.right + 10;
        if (left + tooltipWidth > window.innerWidth) {
            left = rect.left - tooltipWidth - 10;
        }
        
        // Center vertically relative to element
        let top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        if (top < 10) top = 10;
        if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - 10;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.add('show');
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('tooltipDisplay');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }
    
    getTooltipData(upgradeType, isPermanent) {
        if (isPermanent) {
            // Permanent upgrade tooltips
            const permData = {
                permDamage: {
                    title: '⚔️ Permanent Damage Bonus',
                    content: `
                        <p><span class="tooltip-current">Current Bonus:</span> +${this.permUpgrades.damage * 2} damage</p>
                        <p><span class="tooltip-upgrade">Next Level:</span> +${(this.permUpgrades.damage + 1) * 2} damage</p>
                        <p class="tooltip-effect">💡 Every point increases your tower's base damage for all future games</p>
                    `
                },
                permHealth: {
                    title: '❤️ Permanent Health Bonus',
                    content: `
                        <p><span class="tooltip-current">Current Bonus:</span> +${this.permUpgrades.health * 20} max HP</p>
                        <p><span class="tooltip-upgrade">Next Level:</span> +${(this.permUpgrades.health + 1) * 20} max HP</p>
                        <p class="tooltip-effect">💡 Start every game with more health to survive longer</p>
                    `
                },
                permClick: {
                    title: '👆 Permanent Click Power',
                    content: `
                        <p><span class="tooltip-current">Current Bonus:</span> +${this.permUpgrades.clickDamage} click damage</p>
                        <p><span class="tooltip-upgrade">Next Level:</span> +${this.permUpgrades.clickDamage + 1} click damage</p>
                        <p class="tooltip-effect">💡 Your clicks/taps will deal more damage to zombies</p>
                    `
                },
                permGold: {
                    title: '💰 Permanent Starting Gold',
                    content: `
                        <p><span class="tooltip-current">Current Bonus:</span> +${this.permUpgrades.startingGold * 50} starting gold</p>
                        <p><span class="tooltip-upgrade">Next Level:</span> +${(this.permUpgrades.startingGold + 1) * 50} starting gold</p>
                        <p class="tooltip-effect">💡 Begin each game with extra gold for early upgrades</p>
                    `
                }
            };
            return permData[upgradeType];
        } else {
            // In-game upgrade tooltips
            const gameData = {
                damage: {
                    title: '💥 Increase Damage',
                    content: `
                        <p><span class="tooltip-current">Current Damage:</span> ${this.tower.damage}</p>
                        <p><span class="tooltip-upgrade">After Upgrade:</span> ${this.tower.damage + 5}</p>
                        <p class="tooltip-effect">💡 Higher damage kills zombies faster and helps against tougher enemies</p>
                    `
                },
                range: {
                    title: '📡 Increase Range',
                    content: `
                        <p><span class="tooltip-current">Current Range:</span> ${this.tower.range.toFixed(0)}</p>
                        <p><span class="tooltip-upgrade">After Upgrade:</span> ${(this.tower.range + 30).toFixed(0)}</p>
                        <p class="tooltip-effect">💡 Larger range lets you attack enemies earlier, giving more time to defeat them</p>
                    `
                },
                fireRate: {
                    title: '⚡ Faster Fire Rate',
                    content: `
                        <p><span class="tooltip-current">Current Speed:</span> ${this.tower.fireRate.toFixed(2)}s per attack</p>
                        <p><span class="tooltip-upgrade">After Upgrade:</span> ${(this.tower.fireRate - 0.1).toFixed(2)}s per attack</p>
                        <p class="tooltip-effect">💡 Attack more frequently to deal more DPS (damage per second)</p>
                    `
                },
                health: {
                    title: '❤️ Repair Tower',
                    content: `
                        <p><span class="tooltip-current">Current Health:</span> ${this.tower.health}/${this.tower.maxHealth}</p>
                        <p><span class="tooltip-upgrade">After Repair:</span> ${Math.min(this.tower.health + 50, this.tower.maxHealth)}/${this.tower.maxHealth}</p>
                        <p class="tooltip-effect">💡 Restore HP to survive longer. Max HP can't be exceeded</p>
                    `
                },
                targets: {
                    title: '🎯 Multi-Target',
                    content: `
                        <p><span class="tooltip-current">Current Targets:</span> ${this.tower.maxTargets}</p>
                        <p><span class="tooltip-upgrade">After Upgrade:</span> ${this.tower.maxTargets + 1}</p>
                        <p class="tooltip-effect">💡 Attack multiple zombies simultaneously for better crowd control</p>
                    `
                },
                clickDamage: {
                    title: '👆 Click Power',
                    content: `
                        <p><span class="tooltip-current">Current Click Damage:</span> ${this.clickDamage}</p>
                        <p><span class="tooltip-upgrade">After Upgrade:</span> ${this.clickDamage + 2}</p>
                        <p class="tooltip-effect">💡 Manually click/tap zombies to deal damage. Great for finishing off tough enemies</p>
                    `
                },
                chainLightning: {
                    title: '⚡🔗 Chain Lightning',
                    content: `
                        <p><span class="tooltip-current">Current Jumps:</span> ${this.tower.chainLightningJumps}</p>
                        <p><span class="tooltip-upgrade">After Upgrade:</span> ${this.tower.chainLightningJumps + 1}</p>
                        <p class="tooltip-effect">💡 Lightning bounces between enemies, dealing 50% damage per jump. Excellent for groups</p>
                    `
                },
                shield: {
                    title: '🛡️ Shield Generator',
                    content: `
                        <p><span class="tooltip-current">Current Shield:</span> ${this.tower.shield}/${this.tower.maxShield}</p>
                        <p><span class="tooltip-upgrade">After Upgrade:</span> ${this.tower.maxShield + 5} max shield</p>
                        <p class="tooltip-effect">💡 Shields absorb damage before health. Regenerates 1 point every 3 seconds</p>
                    `
                }
            };
            return gameData[upgradeType];
        }
    }
    
    gameOver() {
        this.isGameOver = true;
        this.isPaused = true;
        
        // Play game over sound
        this.playSound('gameOver');
        
        // Update permanent stats
        this.permStats.totalKills += this.kills;
        this.permStats.totalDamageDealt += this.sessionDamage;
        this.permStats.totalClicks += this.sessionClicks;
        this.permStats.totalGoldEarned += this.sessionGoldEarned;
        this.permStats.bossesKilled += this.sessionBossKills;
        this.permStats.totalGamesPlayed++;
        
        // Update zombie type kills
        for (let type in this.sessionZombieKills) {
            this.permStats.zombieKills[type] += this.sessionZombieKills[type];
        }
        
        // Track highest wave
        if (this.wave > this.permStats.highestWave) {
            this.permStats.highestWave = this.wave;
        }
        
        this.savePermanentStats();
        
        // Check for new achievements
        this.checkAchievements();
        
        // Check daily challenges
        this.checkDailyChallenges();
        
        // Update leaderboards
        this.updateLeaderboards();
        
        // Display leaderboards in console
        console.log('\n=== LEADERBOARDS ===');
        console.log('Highest Wave:');
        this.leaderboards.highestWave.slice(0, 5).forEach((entry, i) => {
            console.log(`${i + 1}. ${entry.name} - Wave ${entry.score} (${entry.date})`);
        });
        console.log('\nMost Kills:');
        this.leaderboards.mostKills.slice(0, 5).forEach((entry, i) => {
            console.log(`${i + 1}. ${entry.name} - ${entry.score} kills (${entry.date})`);
        });
        if (this.leaderboards.fastestToWave20.length > 0) {
            console.log('\nFastest to Wave 20:');
            this.leaderboards.fastestToWave20.slice(0, 5).forEach((entry, i) => {
                console.log(`${i + 1}. ${entry.name} - ${this.formatTime(entry.score)} (${entry.date})`);
            });
        }
        
        document.getElementById('finalWave').textContent = this.wave;
        document.getElementById('finalKills').textContent = this.kills;
        document.getElementById('gameOver').classList.add('active');
    }
    
    restart() {
        // Reset session stats
        this.sessionDamage = 0;
        this.sessionClicks = 0;
        this.sessionGoldEarned = 0;
        this.sessionBossKills = 0;
        
        // Reset game speed
        this.gameSpeed = 1;
        this.speedMultiplier = 1;
        this.updateSpeedButton();
        
        // Reset challenge tracking
        this.challengeTracking = {
            upgradesUsed: 0,
            clickKills: 0,
            damageTaken: 0
        };
        
        // Start run timer
        this.runStartTime = Date.now();
        
        // Reset session zombie type kills
        this.sessionZombieKills = {
            normal: 0,
            strong: 0,
            runner: 0,
            tank: 0,
            exploder: 0,
            spawner: 0,
            boss: 0
        };
        
        // Reset everything to base + permanent bonuses
        this.wave = 1;
        this.kills = 0;
        this.tower.level = 1;
        this.tower.range = 150;
        this.tower.fireRate = 1000;
        this.tower.maxTargets = 1;
        this.tower.chainLightning = 0;
        this.tower.shield = 0;
        this.tower.maxShield = 0;
        
        // Apply permanent bonuses (sets health, damage, click damage, gold)
        this.applyPermanentBonuses();
        
        this.upgradeCosts = { damage: 100, range: 80, fireRate: 120, health: 50, targets: 150, clickDamage: 80, chainLightning: 200, shield: 150 };
        this.zombies = [];
        this.lightning = [];
        this.particles = [];
        this.zombiesSpawned = 0;
        this.spawnRate = 2000;
        this.isGameOver = false;
        this.isPaused = false;
        this.isGameStarted = false;
        
        document.getElementById('gameOver').classList.remove('active');
        document.getElementById('upgradeBtn').classList.remove('active');
        document.getElementById('mainMenu').classList.add('active');
        this.updateUI();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.lastFrameTime) this.lastFrameTime = currentTime;
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Apply speed multiplier to deltaTime for game logic
        const speedAdjustedDelta = deltaTime * this.speedMultiplier;
        
        if (!this.isPaused && !this.isGameOver && this.isGameStarted) {
            // Spawn zombies (speed adjusted)
            if (currentTime - this.lastSpawn > this.spawnRate / this.speedMultiplier) {
                this.spawnZombie();
                this.lastSpawn = currentTime;
                this.zombiesSpawned++;
                
                // Increase difficulty every wave
                if (this.zombiesSpawned >= this.zombiesPerWave) {
                    this.wave++;
                    this.zombiesSpawned = 0;
                    this.bossSpawned = false; // Reset boss flag for new wave
                    this.zombiesPerWave = Math.floor(5 + this.wave * 1.5);
                    this.spawnRate = Math.max(500, 2000 - (this.wave * 50)); // Spawn faster
                    
                    // Narration for milestone waves
                    if (this.wave % 5 === 0) {
                        this.showNarration(`⚡ Wave ${this.wave} Incoming! ⚡`, 2000);
                    }
                }
            }
            
            // Update game objects (with speed-adjusted deltaTime)
            this.updateZombies(speedAdjustedDelta);
            this.towerAttack(currentTime);
            this.updateLightning(speedAdjustedDelta);
            this.updateParticles(speedAdjustedDelta);
            this.updateDamageNumbers(speedAdjustedDelta);
            this.updateTowerSparks(speedAdjustedDelta);
            this.updateImpactParticles(speedAdjustedDelta);
            this.updateGoldCoins(speedAdjustedDelta);
            this.handleContinuousShooting(currentTime);
            
            // Health regeneration (5 seconds = 5000ms)
            if (!this.lastRegenTime) this.lastRegenTime = currentTime;
            if (currentTime - this.lastRegenTime >= 5000) {
                if (this.healthRegen && this.healthRegen > 0) {
                    const healAmount = this.healthRegen;
                    if (this.tower.health < this.tower.maxHealth) {
                        this.tower.health = Math.min(this.tower.health + healAmount, this.tower.maxHealth);
                        this.createDamageNumber(this.tower.x, this.tower.y - 50, `+${healAmount} HP`);
                    }
                }
                this.lastRegenTime = currentTime;
            }
            
            this.updateUI();
        }
        
        // Always draw (even on menu/pause)
        this.draw();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    saveGame(slot = null) {
        if (!this.isGameStarted) {
            this.showMessage('No game to save!', '#ff4444');
            return;
        }
        
        // If slot is provided, use it; otherwise use current slot
        const saveSlot = slot !== null ? slot : this.currentSlot;
        
        const playerName = localStorage.getItem('playerName') || 'Player';
        
        const saveData = {
            playerName: playerName,
            wave: this.wave,
            kills: this.kills,
            gold: this.gold,
            tower: {
                health: this.tower.health,
                maxHealth: this.tower.maxHealth,
                level: this.tower.level,
                damage: this.tower.damage,
                range: this.tower.range,
                fireRate: this.tower.fireRate,
                maxTargets: this.tower.maxTargets,
                chainLightning: this.tower.chainLightning,
                shield: this.tower.shield,
                maxShield: this.tower.maxShield
            },
            clickDamage: this.clickDamage,
            upgradeCosts: { ...this.upgradeCosts },
            zombiesPerWave: this.zombiesPerWave,
            spawnRate: this.spawnRate,
            timestamp: Date.now()
        };
        
        localStorage.setItem(`teslaTowerSave_slot${saveSlot}`, JSON.stringify(saveData));
        this.showMessage(`Game Saved! ✓`, '#00ff00');
        this.updateSaveSlotInfo();
    }
    
    loadGame(slot = null) {
        // If slot is provided, use it; otherwise use current slot
        const loadSlot = slot !== null ? slot : this.currentSlot;
        
        const saveData = localStorage.getItem(`teslaTowerSave_slot${loadSlot}`);
        
        if (!saveData) {
            this.showMessage(`No saved game in Slot ${loadSlot}!`, '#ff4444');
            return;
        }
        
        try {
            const data = JSON.parse(saveData);
            
            // Update current slot
            this.currentSlot = loadSlot;
            localStorage.setItem('currentSlot', loadSlot);
            
            // Restore player name if it exists in save data
            if (data.playerName) {
                localStorage.setItem('playerName', data.playerName);
            }
            
            // Reload permanent stats and achievements for this slot
            this.loadPermanentStats();
            this.loadAchievements();
            
            // Restore game state
            this.wave = data.wave;
            this.kills = data.kills;
            this.gold = data.gold;
            this.tower.health = data.tower.health;
            this.tower.maxHealth = data.tower.maxHealth;
            this.tower.level = data.tower.level;
            this.tower.damage = data.tower.damage;
            this.tower.range = data.tower.range;
            this.tower.fireRate = data.tower.fireRate;
            this.tower.maxTargets = data.tower.maxTargets;
            this.tower.chainLightning = data.tower.chainLightning;
            this.tower.shield = data.tower.shield;
            this.tower.maxShield = data.tower.maxShield;
            this.clickDamage = data.clickDamage;
            this.upgradeCosts = { ...data.upgradeCosts };
            this.zombiesPerWave = data.zombiesPerWave;
            this.spawnRate = data.spawnRate;
            
            // Clear existing zombies
            this.zombies = [];
            this.zombiesSpawned = 0;
            this.bossSpawned = false;
            
            // Reset game state flags
            this.isGameStarted = false;
            this.isGameOver = false;
            this.isPaused = false;
            
            // Close save slot panel and show main menu
            this.closeSaveSlotPanel();
            document.getElementById('titleScreen').classList.remove('active');
            document.getElementById('upgradeBtn').classList.remove('active');
            document.getElementById('mainMenu').classList.add('active');
            
            // Update player name display
            const loadedPlayerName = localStorage.getItem('playerName') || 'Player';
            document.getElementById('currentPlayerName').textContent = `Player: ${loadedPlayerName}`;
            
            this.updateUI();
            this.updateUpgradePanel();
            this.updateSaveSlotInfo();
            this.showMessage(`Game Loaded from Slot ${loadSlot}! ✓`, '#00ff00');
            
        } catch (error) {
            console.error('Failed to load game:', error);
            this.showMessage('Failed to load game!', '#ff4444');
        }
    }
    
    deleteSave(slot) {
        localStorage.removeItem(`teslaTowerSave_slot${slot}`);
        this.showMessage(`Slot ${slot} Deleted! ✓`, '#ff9900');
        this.updateSaveSlotInfo();
    }
    
    updateSaveSlotInfo() {
        for (let i = 1; i <= 3; i++) {
            const saveData = localStorage.getItem(`teslaTowerSave_slot${i}`);
            const permData = localStorage.getItem(`teslaTowerPermanent_slot${i}`);
            const slotElement = document.getElementById(`slotInfo${i}`);
            
            if (saveData) {
                try {
                    const data = JSON.parse(saveData);
                    const date = new Date(data.timestamp);
                    const playerName = data.playerName || 'Player';
                    
                    let infoHTML = `
                        <strong style="color: #00ffff;">${playerName}</strong><br>
                        <strong>Wave ${data.wave}</strong> - ${data.kills} Kills<br>
                        <small>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</small>
                    `;
                    
                    // Add permanent stats info if available
                    if (permData) {
                        try {
                            const perm = JSON.parse(permData);
                            infoHTML += `<br><small style="color: #ffd700;">⭐ Total Kills: ${perm.totalKills.toLocaleString()}</small>`;
                        } catch (e) {}
                    }
                    
                    slotElement.innerHTML = infoHTML;
                } catch (error) {
                    slotElement.innerHTML = '<span style="color: #888;">Empty Slot</span>';
                }
            } else {
                slotElement.innerHTML = '<span style="color: #888;">Empty Slot</span>';
            }
        }
        
        // Update current slot indicator
        document.querySelectorAll('.save-slot').forEach((slot, index) => {
            if (index + 1 === this.currentSlot) {
                slot.classList.add('current-slot');
            } else {
                slot.classList.remove('current-slot');
            }
        });
    }
    
    openSaveSlotPanel() {
        console.log('Opening save slot panel...');
        const backdrop = document.getElementById('saveSlotBackdrop');
        const panel = document.getElementById('saveSlotPanel');
        console.log('Panel element:', panel);
        if (panel && backdrop) {
            backdrop.classList.add('active');
            panel.classList.add('active');
            this.updateSaveSlotInfo();
            console.log('Panel should be visible now');
        } else {
            console.error('Save slot panel not found!');
        }
    }
    
    closeSaveSlotPanel() {
        console.log('Closing save slot panel...');
        document.getElementById('saveSlotBackdrop').classList.remove('active');
        document.getElementById('saveSlotPanel').classList.remove('active');
    }
    
    loadPermanentStats() {
        // Load permanent stats for current slot
        const saved = localStorage.getItem(`teslaTowerPermanent_slot${this.currentSlot}`);
        if (saved) {
            this.permStats = JSON.parse(saved);
            // Add zombie kills if not present (for backward compatibility)
            if (!this.permStats.zombieKills) {
                this.permStats.zombieKills = {
                    normal: 0,
                    strong: 0,
                    runner: 0,
                    tank: 0,
                    exploder: 0,
                    boss: 0
                };
            }
        } else {
            this.permStats = {
                totalKills: 0,
                bonusDamage: 0,
                bonusHealth: 0,
                bonusClickDamage: 0,
                bonusStartGold: 0,
                gems: 0, // Premium currency
                // Gem shop upgrades
                gemUpgrades: {
                    damageMultiplier: 0,
                    healthMultiplier: 0,
                    goldMultiplier: 0,
                    xpMultiplier: 0,
                    critChance: 0,
                    healthRegen: 0
                },
                // Lifetime stats
                totalDamageDealt: 0,
                totalClicks: 0,
                highestWave: 0,
                totalGamesPlayed: 0,
                totalGoldEarned: 0,
                bossesKilled: 0,
                // Zombie type kills
                zombieKills: {
                    normal: 0,
                    strong: 0,
                    runner: 0,
                    tank: 0,
                    exploder: 0,
                    spawner: 0,
                    boss: 0
                }
            };
        }
        
        // Add gems if not present (backward compatibility)
        if (this.permStats.gems === undefined) {
            this.permStats.gems = 0;
        }
        
        // Add gem upgrades if not present (backward compatibility)
        if (!this.permStats.gemUpgrades) {
            this.permStats.gemUpgrades = {
                damageMultiplier: 0,
                healthMultiplier: 0,
                goldMultiplier: 0,
                xpMultiplier: 0,
                critChance: 0,
                healthRegen: 0
            };
        }
        
        // Add daily rewards if not present (backward compatibility)
        if (!this.permStats.dailyRewards) {
            this.permStats.dailyRewards = {
                lastLogin: null,
                streak: 0,
                claimed: []
            };
        }
        
        // Add themes if not present (backward compatibility)
        if (!this.permStats.themes) {
            this.permStats.themes = {
                unlocked: ['classic'], // Classic is always unlocked
                current: 'classic'
            };
        }
        
        // Check for daily reward
        this.checkDailyReward();
        
        // NOTE: Don't call applyPermanentBonuses here - tower doesn't exist yet!
        // It will be called from init() after everything is set up
        
        // Initialize achievements
        this.loadAchievements();
        
        // Initialize daily challenges
        this.loadDailyChallenges();
        
        // Initialize leaderboards
        this.loadLeaderboards();
        
        // Initialize sound system
        this.initSounds();
    }
    
    checkDailyReward() {
        const today = new Date().toDateString();
        const lastLogin = this.permStats.dailyRewards.lastLogin;
        
        // If last login was not today, show reward
        if (lastLogin !== today) {
            // Calculate streak
            if (lastLogin) {
                const lastDate = new Date(lastLogin);
                const todayDate = new Date(today);
                const diffTime = todayDate - lastDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    // Consecutive day - increase streak
                    this.permStats.dailyRewards.streak++;
                } else if (diffDays > 1) {
                    // Streak broken - reset
                    this.permStats.dailyRewards.streak = 1;
                }
            } else {
                // First time login
                this.permStats.dailyRewards.streak = 1;
            }
            
            // Show reward popup after a delay
            setTimeout(() => {
                this.showDailyRewardPopup();
            }, 1500);
        }
    }
    
    showDailyRewardPopup() {
        const streak = this.permStats.dailyRewards.streak;
        const rewards = this.calculateDailyReward(streak);
        
        const popup = document.getElementById('dailyRewardPopup');
        const info = document.getElementById('dailyRewardInfo');
        
        info.innerHTML = `
            <p class="streak-info">🔥 Login Streak: Day ${streak}</p>
            <p>You've earned:</p>
            <p class="reward-highlight">💎 +${rewards.gems} Gems</p>
            <p class="reward-highlight">💀 +${rewards.kills} Kills</p>
            ${streak % 7 === 0 ? '<p style="color: #ff00ff;">🎉 Weekly Bonus!</p>' : ''}
        `;
        
        popup.classList.add('show');
    }
    
    calculateDailyReward(streak) {
        // Base rewards
        let gems = 5;
        let kills = 50;
        
        // Bonus for streak
        const streakBonus = Math.floor(streak / 3); // Bonus every 3 days
        gems += streakBonus * 2;
        kills += streakBonus * 25;
        
        // Weekly bonus (day 7, 14, 21, etc.)
        if (streak % 7 === 0) {
            gems += 15;
            kills += 100;
        }
        
        return { gems, kills };
    }
    
    claimDailyReward() {
        const streak = this.permStats.dailyRewards.streak;
        const rewards = this.calculateDailyReward(streak);
        
        // Add rewards
        this.permStats.gems += rewards.gems;
        this.permStats.totalKills += rewards.kills;
        
        // Update last login
        this.permStats.dailyRewards.lastLogin = new Date().toDateString();
        
        // Save
        this.savePermanentStats();
        
        // Hide popup
        document.getElementById('dailyRewardPopup').classList.remove('show');
        
        // Show confirmation
        this.showMessage(`Daily Reward Claimed! 💎 +${rewards.gems} Gems, 💀 +${rewards.kills} Kills`, '#ffd700');
        this.playSound('achievement');
        
        // Update UI
        this.updateUI();
    }
    
    applyPermanentBonuses() {
        // Reset to base stats first
        const baseHealth = 100;
        const baseDamage = 10;
        const baseClickDamage = 5;
        const baseGold = 100;
        
        // Apply kill-based bonuses
        let health = baseHealth + this.permStats.bonusHealth;
        let damage = baseDamage + this.permStats.bonusDamage;
        let clickDamage = baseClickDamage + this.permStats.bonusClickDamage;
        let gold = baseGold + this.permStats.bonusStartGold;
        
        // Apply gem shop multipliers
        const damageMultiplier = 1 + (this.permStats.gemUpgrades.damageMultiplier * 0.1);
        const healthMultiplier = 1 + (this.permStats.gemUpgrades.healthMultiplier * 0.1);
        const goldMultiplier = 1 + (this.permStats.gemUpgrades.goldMultiplier * 0.2);
        
        damage = Math.floor(damage * damageMultiplier);
        health = Math.floor(health * healthMultiplier);
        gold = Math.floor(gold * goldMultiplier);
        
        // Set final values
        this.tower.health = health;
        this.tower.maxHealth = health;
        this.tower.damage = damage;
        this.clickDamage = clickDamage;
        this.gold = gold;
        
        // Store multipliers for other systems
        this.goldMultiplier = goldMultiplier;
        this.xpMultiplier = 1 + (this.permStats.gemUpgrades.xpMultiplier * 0.15);
        this.critChance = this.permStats.gemUpgrades.critChance * 0.05; // 5% per level
        this.healthRegen = this.permStats.gemUpgrades.healthRegen; // 1 HP per 5 seconds per level
    }
    
    applyTheme(themeName = null) {
        // Use current theme if none specified
        const theme = themeName || this.permStats.themes.current;
        const themes = this.getThemes();
        const themeData = themes[theme];
        
        if (!themeData) {
            console.error('Theme not found:', theme);
            return;
        }
        
        // Apply theme colors to CSS variables
        const root = document.documentElement;
        root.style.setProperty('--primary-color', themeData.colors.primary);
        root.style.setProperty('--secondary-color', themeData.colors.secondary);
        root.style.setProperty('--background-color', themeData.colors.background);
        root.style.setProperty('--panel-color', themeData.colors.panel);
        root.style.setProperty('--text-color', themeData.colors.text);
        root.style.setProperty('--border-color', themeData.colors.border);
        root.style.setProperty('--success-color', themeData.colors.success);
        root.style.setProperty('--danger-color', themeData.colors.danger);
        root.style.setProperty('--warning-color', themeData.colors.warning);
        root.style.setProperty('--gold-color', themeData.colors.gold);
        
        // Update current theme
        this.permStats.themes.current = theme;
        this.savePermanentStats();
        
        // Show message
        if (themeName) {
            this.showMessage(`Theme applied: ${themeData.name}`, themeData.colors.primary);
            this.playSound('achievement');
        }
    }
    
    checkThemeUnlock(themeKey) {
        const themes = this.getThemes();
        const theme = themes[themeKey];
        
        if (!theme || !theme.requirement) return true;
        
        // Check if achievement requirement is met
        const achievement = this.achievements.find(a => a.id === theme.requirement);
        return achievement && achievement.unlocked;
    }
    
    unlockTheme(themeKey) {
        const themes = this.getThemes();
        const theme = themes[themeKey];
        
        if (!theme) {
            this.showMessage('Theme not found!', '#ff0000');
            return false;
        }
        
        // Check if already unlocked
        if (this.permStats.themes.unlocked.includes(themeKey)) {
            this.showMessage('Theme already unlocked!', '#ffaa00');
            return false;
        }
        
        // Check achievement requirement
        if (!this.checkThemeUnlock(themeKey)) {
            this.showMessage('Achievement requirement not met!', '#ff0000');
            return false;
        }
        
        // Check gem cost
        if (this.permStats.gems < theme.cost) {
            this.showMessage(`Not enough gems! Need ${theme.cost}`, '#ff0000');
            return false;
        }
        
        // Purchase theme
        this.permStats.gems -= theme.cost;
        this.permStats.themes.unlocked.push(themeKey);
        this.savePermanentStats();
        
        this.showMessage(`Unlocked ${theme.name} theme!`, '#ffd700');
        this.playSound('achievement');
        
        // Apply theme immediately
        this.applyTheme(themeKey);
        
        // Update UI
        this.updateThemesPanel();
        this.updateUI();
        
        return true;
    }
    
    initSounds() {
        // Create audio context
        this.audioContext = null;
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        
        // Initialize audio context on first user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
        
        // Initialize Text-to-Speech
        this.initTTS();
    }
    
    initTTS() {
        // Check if browser supports speech synthesis
        if ('speechSynthesis' in window) {
            this.ttsEnabled = localStorage.getItem('ttsEnabled') !== 'false';
            this.ttsVoice = null;
            console.log('TTS initialized. Enabled:', this.ttsEnabled);
            
            // Load voices when they become available
            const loadVoices = () => {
                const voices = speechSynthesis.getVoices();
                console.log('Available voices:', voices.length);
                
                // Priority list for high-quality voices (in order of preference)
                const voicePriority = [
                    // Chrome/Edge premium voices
                    v => v.name.includes('Google US English') || v.name.includes('Google UK English'),
                    // Microsoft natural voices (Windows 11+)
                    v => v.name.includes('Microsoft') && (v.name.includes('Aria') || v.name.includes('Guy') || v.name.includes('Jenny')),
                    // Apple premium voices
                    v => v.name.includes('Samantha') || v.name.includes('Alex'),
                    // Any Google voice
                    v => v.name.includes('Google') && v.lang.startsWith('en'),
                    // Any Microsoft natural voice
                    v => v.name.includes('Microsoft') && v.lang.startsWith('en') && !v.name.includes('Zira') && !v.name.includes('David'),
                    // Any Apple voice
                    v => v.name.includes('Apple') && v.lang.startsWith('en'),
                    // Any English voice
                    v => v.lang.startsWith('en')
                ];
                
                // Try each priority until we find a voice
                for (const priorityCheck of voicePriority) {
                    this.ttsVoice = voices.find(priorityCheck);
                    if (this.ttsVoice) break;
                }
                
                // Fallback to first available voice
                if (!this.ttsVoice && voices.length > 0) {
                    this.ttsVoice = voices[0];
                }
                
                if (this.ttsVoice) {
                    console.log('Selected voice:', this.ttsVoice.name, this.ttsVoice.lang);
                    console.log('Voice local:', this.ttsVoice.localService ? 'Local' : 'Network');
                } else {
                    console.warn('No voice selected');
                }
            };
            
            // Some browsers load voices asynchronously
            if (speechSynthesis.getVoices().length > 0) {
                loadVoices();
            } else {
                speechSynthesis.addEventListener('voiceschanged', loadVoices);
            }
        } else {
            this.ttsEnabled = false;
            console.warn('Text-to-Speech not supported in this browser');
        }
    }
    
    speak(text, options = {}) {
        // Check if TTS is available and enabled
        if (!('speechSynthesis' in window)) {
            console.warn('Speech Synthesis not supported');
            return;
        }
        
        if (!this.ttsEnabled) {
            console.log('TTS disabled by user');
            return;
        }
        
        console.log('🗣️ Speaking:', text);
        
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice if available
        if (this.ttsVoice) {
            utterance.voice = this.ttsVoice;
        }
        
        // Configure speech parameters
        utterance.rate = options.rate || 1.0; // Speed (0.1 to 10)
        utterance.pitch = options.pitch || 1.0; // Pitch (0 to 2)
        utterance.volume = options.volume || 1.0; // Volume (0 to 1)
        
        // Add error handling
        utterance.onerror = (event) => {
            console.error('Speech error:', event);
        };
        
        utterance.onstart = () => {
            console.log('Speech started');
        };
        
        utterance.onend = () => {
            console.log('Speech ended');
        };
        
        // Speak
        try {
            speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Error speaking:', error);
        }
    }
    
    toggleTTS() {
        this.ttsEnabled = !this.ttsEnabled;
        localStorage.setItem('ttsEnabled', this.ttsEnabled);
        this.showMessage(this.ttsEnabled ? 'Voice ON 🗣️' : 'Voice OFF 🔇', this.ttsEnabled ? '#00ff00' : '#ff0000');
        
        if (this.ttsEnabled) {
            this.speak('Voice announcements enabled');
        }
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('soundEnabled', this.soundEnabled);
        document.getElementById('soundToggle').textContent = this.soundEnabled ? '🔊' : '🔇';
        this.showMessage(this.soundEnabled ? 'Sound ON' : 'Sound OFF', this.soundEnabled ? '#00ff00' : '#ff0000');
    }
    
    cycleGameSpeed() {
        // Cycle through speeds: 1x -> 2x -> 4x -> 1x
        if (this.gameSpeed === 1) {
            this.gameSpeed = 2;
            this.speedMultiplier = 2;
        } else if (this.gameSpeed === 2) {
            this.gameSpeed = 4;
            this.speedMultiplier = 4;
        } else {
            this.gameSpeed = 1;
            this.speedMultiplier = 1;
        }
        
        this.updateSpeedButton();
        this.playSound('click');
        
        // Show speed change message
        const speedColors = { 1: '#00ffff', 2: '#ffff00', 4: '#ff00ff' };
        this.showMessage(`Speed: ${this.gameSpeed}x`, speedColors[this.gameSpeed]);
    }
    
    getThemes() {
        return {
            classic: {
                name: 'Classic',
                description: 'The original Tesla Tower theme',
                cost: 0,
                requirement: null,
                colors: {
                    primary: '#00ffff',
                    secondary: '#ff00ff',
                    background: '#0a0a1a',
                    panel: '#1a1a2e',
                    text: '#ffffff',
                    border: '#00ffff',
                    success: '#00ff00',
                    danger: '#ff0000',
                    warning: '#ffff00',
                    gold: '#ffd700'
                }
            },
            darkPurple: {
                name: 'Dark Purple',
                description: 'Mystical purple energy',
                cost: 50,
                requirement: 'wave5',
                colors: {
                    primary: '#9d4edd',
                    secondary: '#c77dff',
                    background: '#10002b',
                    panel: '#240046',
                    text: '#e0aaff',
                    border: '#7b2cbf',
                    success: '#06ffa5',
                    danger: '#ff006e',
                    warning: '#ffbe0b',
                    gold: '#ffd60a'
                }
            },
            oceanBlue: {
                name: 'Ocean Blue',
                description: 'Deep sea currents',
                cost: 75,
                requirement: 'wave10',
                colors: {
                    primary: '#0077b6',
                    secondary: '#00b4d8',
                    background: '#03045e',
                    panel: '#023e8a',
                    text: '#caf0f8',
                    border: '#0096c7',
                    success: '#06ffa5',
                    danger: '#e63946',
                    warning: '#f77f00',
                    gold: '#ffd60a'
                }
            },
            forestGreen: {
                name: 'Forest Green',
                description: 'Nature\'s power',
                cost: 100,
                requirement: 'wave20',
                colors: {
                    primary: '#2d6a4f',
                    secondary: '#52b788',
                    background: '#081c15',
                    panel: '#1b4332',
                    text: '#d8f3dc',
                    border: '#40916c',
                    success: '#95d5b2',
                    danger: '#d00000',
                    warning: '#ffba08',
                    gold: '#ffd60a'
                }
            },
            sunsetOrange: {
                name: 'Sunset Orange',
                description: 'Blazing fire energy',
                cost: 125,
                requirement: 'killStreak100',
                colors: {
                    primary: '#ff6d00',
                    secondary: '#ff9e00',
                    background: '#1a0800',
                    panel: '#370617',
                    text: '#ffe5d9',
                    border: '#ff8500',
                    success: '#06ffa5',
                    danger: '#c9184a',
                    warning: '#ffd60a',
                    gold: '#ffe169'
                }
            },
            neonPink: {
                name: 'Neon Pink',
                description: 'Cyberpunk vibes',
                cost: 150,
                requirement: 'perfectWave',
                colors: {
                    primary: '#ff006e',
                    secondary: '#ff0a54',
                    background: '#000000',
                    panel: '#1a001a',
                    text: '#ffccd5',
                    border: '#ff0080',
                    success: '#06ffa5',
                    danger: '#fb5607',
                    warning: '#ffbe0b',
                    gold: '#ffd60a'
                }
            },
            goldenRoyal: {
                name: 'Golden Royal',
                description: 'Luxurious gold and purple',
                cost: 200,
                requirement: 'allAchievements',
                colors: {
                    primary: '#ffd700',
                    secondary: '#7209b7',
                    background: '#0f0a1e',
                    panel: '#1e1333',
                    text: '#f6e8ff',
                    border: '#b5179e',
                    success: '#06ffa5',
                    danger: '#d00000',
                    warning: '#ffba08',
                    gold: '#ffea00'
                }
            }
        };
    }
    
    updateSpeedButton() {
        const speedBtn = document.getElementById('speedToggle');
        const speedIcon = speedBtn.querySelector('.speed-icon');
        const speedText = speedBtn.querySelector('.speed-text');
        
        // Update text
        speedText.textContent = `${this.gameSpeed}x`;
        
        // Update icon
        if (this.gameSpeed === 1) {
            speedIcon.textContent = '▶';
            speedBtn.classList.remove('speed-2x', 'speed-4x');
        } else if (this.gameSpeed === 2) {
            speedIcon.textContent = '⏩';
            speedBtn.classList.remove('speed-4x');
            speedBtn.classList.add('speed-2x');
        } else if (this.gameSpeed === 4) {
            speedIcon.textContent = '⏭';
            speedBtn.classList.remove('speed-2x');
            speedBtn.classList.add('speed-4x');
        }
    }
    
    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        switch(type) {
            case 'lightning':
                // Electric zap sound
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                
                osc1.frequency.setValueAtTime(800, now);
                osc1.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain1.gain.setValueAtTime(0.1, now);
                gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                
                osc1.start(now);
                osc1.stop(now + 0.1);
                break;
                
            case 'zombieHit':
                // Thud sound
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                
                osc2.frequency.setValueAtTime(100, now);
                osc2.frequency.exponentialRampToValueAtTime(50, now + 0.15);
                gain2.gain.setValueAtTime(0.15, now);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                
                osc2.start(now);
                osc2.stop(now + 0.15);
                break;
                
            case 'zombieDeath':
                // Death sound
                const osc3 = ctx.createOscillator();
                const gain3 = ctx.createGain();
                osc3.connect(gain3);
                gain3.connect(ctx.destination);
                
                osc3.type = 'sawtooth';
                osc3.frequency.setValueAtTime(300, now);
                osc3.frequency.exponentialRampToValueAtTime(50, now + 0.3);
                gain3.gain.setValueAtTime(0.2, now);
                gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                
                osc3.start(now);
                osc3.stop(now + 0.3);
                break;
                
            case 'gold':
                // Coin pickup sound
                const osc4 = ctx.createOscillator();
                const gain4 = ctx.createGain();
                osc4.connect(gain4);
                gain4.connect(ctx.destination);
                
                osc4.frequency.setValueAtTime(800, now);
                osc4.frequency.setValueAtTime(1200, now + 0.05);
                gain4.gain.setValueAtTime(0.15, now);
                gain4.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                
                osc4.start(now);
                osc4.stop(now + 0.15);
                break;
                
            case 'upgrade':
                // Power up sound
                const osc5 = ctx.createOscillator();
                const gain5 = ctx.createGain();
                osc5.connect(gain5);
                gain5.connect(ctx.destination);
                
                osc5.frequency.setValueAtTime(400, now);
                osc5.frequency.setValueAtTime(600, now + 0.05);
                osc5.frequency.setValueAtTime(800, now + 0.1);
                gain5.gain.setValueAtTime(0.2, now);
                gain5.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                
                osc5.start(now);
                osc5.stop(now + 0.2);
                break;
                
            case 'boss':
                // Boss warning sound
                const osc6 = ctx.createOscillator();
                const gain6 = ctx.createGain();
                osc6.connect(gain6);
                gain6.connect(ctx.destination);
                
                osc6.type = 'square';
                osc6.frequency.setValueAtTime(200, now);
                osc6.frequency.setValueAtTime(150, now + 0.1);
                osc6.frequency.setValueAtTime(200, now + 0.2);
                gain6.gain.setValueAtTime(0.15, now);
                gain6.gain.setValueAtTime(0.15, now + 0.3);
                gain6.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                
                osc6.start(now);
                osc6.stop(now + 0.4);
                break;
                
            case 'achievement':
                // Achievement unlock sound
                const osc7a = ctx.createOscillator();
                const osc7b = ctx.createOscillator();
                const gain7 = ctx.createGain();
                osc7a.connect(gain7);
                osc7b.connect(gain7);
                gain7.connect(ctx.destination);
                
                osc7a.frequency.setValueAtTime(523, now); // C5
                osc7b.frequency.setValueAtTime(659, now); // E5
                osc7a.frequency.setValueAtTime(784, now + 0.1); // G5
                osc7b.frequency.setValueAtTime(1047, now + 0.1); // C6
                gain7.gain.setValueAtTime(0.2, now);
                gain7.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                
                osc7a.start(now);
                osc7b.start(now);
                osc7a.stop(now + 0.3);
                osc7b.stop(now + 0.3);
                break;
                
            case 'gameOver':
                // Game over sound
                const osc8 = ctx.createOscillator();
                const gain8 = ctx.createGain();
                osc8.connect(gain8);
                gain8.connect(ctx.destination);
                
                osc8.type = 'triangle';
                osc8.frequency.setValueAtTime(400, now);
                osc8.frequency.exponentialRampToValueAtTime(100, now + 0.5);
                gain8.gain.setValueAtTime(0.25, now);
                gain8.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                
                osc8.start(now);
                osc8.stop(now + 0.5);
                break;
        }
    }
    
    loadAchievements() {
        // Load achievements for current slot
        const saved = localStorage.getItem(`teslaTowerAchievements_slot${this.currentSlot}`);
        if (saved) {
            this.achievements = JSON.parse(saved);
        } else {
            this.achievements = [
                { id: 'kills_10', name: 'First Blood', desc: 'Kill 10 zombies', icon: '🩸', unlocked: false, requirement: 10, stat: 'totalKills', gemReward: 5 },
                { id: 'kills_100', name: 'Zombie Slayer', desc: 'Kill 100 zombies', icon: '⚔️', unlocked: false, requirement: 100, stat: 'totalKills', gemReward: 10 },
                { id: 'kills_500', name: 'Zombie Hunter', desc: 'Kill 500 zombies', icon: '🏹', unlocked: false, requirement: 500, stat: 'totalKills', gemReward: 25 },
                { id: 'kills_1000', name: 'Zombie Destroyer', desc: 'Kill 1000 zombies', icon: '💀', unlocked: false, requirement: 1000, stat: 'totalKills', gemReward: 50 },
                
                { id: 'wave_5', name: 'Getting Started', desc: 'Reach wave 5', icon: '🌊', unlocked: false, requirement: 5, stat: 'highestWave', gemReward: 5 },
                { id: 'wave_10', name: 'Wave Master', desc: 'Reach wave 10', icon: '🌀', unlocked: false, requirement: 10, stat: 'highestWave', gemReward: 15 },
                { id: 'wave_20', name: 'Wave Legend', desc: 'Reach wave 20', icon: '🌪️', unlocked: false, requirement: 20, stat: 'highestWave', gemReward: 30 },
                { id: 'wave_30', name: 'Wave God', desc: 'Reach wave 30', icon: '⚡', unlocked: false, requirement: 30, stat: 'highestWave', gemReward: 75 },
                
                { id: 'damage_10000', name: 'Power Striker', desc: 'Deal 10,000 damage', icon: '💥', unlocked: false, requirement: 10000, stat: 'totalDamageDealt', gemReward: 10 },
                { id: 'damage_100000', name: 'Damage Dealer', desc: 'Deal 100,000 damage', icon: '💣', unlocked: false, requirement: 100000, stat: 'totalDamageDealt', gemReward: 40 },
                
                { id: 'clicks_500', name: 'Click Happy', desc: 'Click 500 times', icon: '👆', unlocked: false, requirement: 500, stat: 'totalClicks', gemReward: 10 },
                { id: 'clicks_5000', name: 'Click Master', desc: 'Click 5000 times', icon: '🖱️', unlocked: false, requirement: 5000, stat: 'totalClicks', gemReward: 35 },
                
                { id: 'boss_1', name: 'Boss Buster', desc: 'Kill your first boss', icon: '👑', unlocked: false, requirement: 1, stat: 'bossesKilled', gemReward: 20 },
                { id: 'boss_10', name: 'Boss Hunter', desc: 'Kill 10 bosses', icon: '🏆', unlocked: false, requirement: 10, stat: 'bossesKilled', gemReward: 50 },
                
                { id: 'gold_5000', name: 'Gold Collector', desc: 'Earn 5000 gold', icon: '💰', unlocked: false, requirement: 5000, stat: 'totalGoldEarned', gemReward: 15 },
                { id: 'gold_50000', name: 'Gold Tycoon', desc: 'Earn 50,000 gold', icon: '💎', unlocked: false, requirement: 50000, stat: 'totalGoldEarned', gemReward: 45 },
                
                { id: 'games_10', name: 'Dedicated', desc: 'Play 10 games', icon: '🎮', unlocked: false, requirement: 10, stat: 'totalGamesPlayed', gemReward: 10 },
                { id: 'games_50', name: 'Persistent', desc: 'Play 50 games', icon: '🕹️', unlocked: false, requirement: 50, stat: 'totalGamesPlayed', gemReward: 40 }
            ];
        }
        
        // Add gem rewards to existing achievements if missing (backward compatibility)
        const gemRewards = {
            'kills_10': 5, 'kills_100': 10, 'kills_500': 25, 'kills_1000': 50,
            'wave_5': 5, 'wave_10': 15, 'wave_20': 30, 'wave_30': 75,
            'damage_10000': 10, 'damage_100000': 40,
            'clicks_500': 10, 'clicks_5000': 35,
            'boss_1': 20, 'boss_10': 50,
            'gold_5000': 15, 'gold_50000': 45,
            'games_10': 10, 'games_50': 40
        };
        this.achievements.forEach(ach => {
            if (ach.gemReward === undefined && gemRewards[ach.id]) {
                ach.gemReward = gemRewards[ach.id];
            }
        });
    }
    
    saveAchievements() {
        // Save achievements for current slot
        localStorage.setItem(`teslaTowerAchievements_slot${this.currentSlot}`, JSON.stringify(this.achievements));
    }
    
    checkAchievements() {
        let newUnlocks = 0;
        let totalGemsEarned = 0;
        
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked) {
                const statValue = this.permStats[achievement.stat];
                if (statValue >= achievement.requirement) {
                    achievement.unlocked = true;
                    newUnlocks++;
                    
                    // Award gems for achievement
                    const gemReward = achievement.gemReward || 0;
                    this.permStats.gems += gemReward;
                    totalGemsEarned += gemReward;
                    
                    this.showAchievementUnlock(achievement);
                }
            }
        });
        
        if (newUnlocks > 0) {
            this.saveAchievements();
            this.savePermanentStats();
            
            // Show gems earned message
            if (totalGemsEarned > 0) {
                setTimeout(() => {
                    this.showMessage(`+${totalGemsEarned} Gems Earned! 💎`, '#ff00ff');
                }, 2000);
            }
        }
    }
    
    showAchievementUnlock(achievement) {
        // Play achievement sound
        this.playSound('achievement');
        
        // Show narration
        this.showNarration('🏆 ACHIEVEMENT UNLOCKED! 🏆', 3000);
        
        // Speak achievement name with excitement
        this.speak(`Achievement unlocked! ${achievement.name}`, { rate: 0.95, pitch: 1.05, volume: 1.0 });
        
        const gemReward = achievement.gemReward || 0;
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.desc}</div>
                ${gemReward > 0 ? `<div class="achievement-reward">+${gemReward} Gems 💎</div>` : ''}
            </div>
        `;
        document.body.appendChild(popup);
        
        // Animate in
        setTimeout(() => popup.classList.add('show'), 100);
        
        // Remove after 4 seconds
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    }
    
    savePermanentStats() {
        // Save permanent stats for current slot
        localStorage.setItem(`teslaTowerPermanent_slot${this.currentSlot}`, JSON.stringify(this.permStats));
    }
    
    openPermUpgradesPanel() {
        document.getElementById('permUpgradesBackdrop').classList.add('active');
        document.getElementById('permUpgradesPanel').classList.add('active');
        this.updatePermUpgradesPanel();
    }
    
    closePermUpgradesPanel() {
        document.getElementById('permUpgradesBackdrop').classList.remove('active');
        document.getElementById('permUpgradesPanel').classList.remove('active');
    }
    
    // Gem Shop Functions
    openGemShopPanel() {
        document.getElementById('gemShopBackdrop').classList.add('active');
        document.getElementById('gemShopPanel').classList.add('active');
        this.updateGemShopPanel();
    }
    
    closeGemShopPanel() {
        document.getElementById('gemShopBackdrop').classList.remove('active');
        document.getElementById('gemShopPanel').classList.remove('active');
    }
    
    updateGemShopPanel() {
        document.getElementById('shopGemsAmount').textContent = this.permStats.gems;
        document.getElementById('shopTotalKills').textContent = this.permStats.totalKills;
        
        // Update gem upgrade owned levels
        document.getElementById('gemDamageLevel').textContent = this.permStats.gemUpgrades.damageMultiplier;
        document.getElementById('gemHealthLevel').textContent = this.permStats.gemUpgrades.healthMultiplier;
        document.getElementById('gemGoldLevel').textContent = this.permStats.gemUpgrades.goldMultiplier;
        document.getElementById('gemXPLevel').textContent = this.permStats.gemUpgrades.xpMultiplier;
        document.getElementById('gemCritLevel').textContent = this.permStats.gemUpgrades.critChance;
        document.getElementById('gemRegenLevel').textContent = this.permStats.gemUpgrades.healthRegen;
        
        // Update kill upgrade owned levels
        document.getElementById('permBonusDamageLevel').textContent = '+' + this.permStats.bonusDamage;
        document.getElementById('permBonusHealthLevel').textContent = '+' + this.permStats.bonusHealth;
        document.getElementById('permBonusClickLevel').textContent = '+' + this.permStats.bonusClickDamage;
        document.getElementById('permBonusGoldLevel').textContent = '+' + this.permStats.bonusStartGold;
        
        // Update gem upgrade costs (increase by 10% per level owned)
        const baseCosts = { damageMultiplier: 50, healthMultiplier: 50, goldMultiplier: 75, xpMultiplier: 60, critChance: 100, healthRegen: 80 };
        Object.keys(baseCosts).forEach(upgrade => {
            const level = this.permStats.gemUpgrades[upgrade];
            const cost = Math.floor(baseCosts[upgrade] * Math.pow(1.1, level));
            const upgradeMap = {
                damageMultiplier: 'gemDamageCost',
                healthMultiplier: 'gemHealthCost',
                goldMultiplier: 'gemGoldCost',
                xpMultiplier: 'gemXPCost',
                critChance: 'gemCritCost',
                healthRegen: 'gemRegenCost'
            };
            document.getElementById(upgradeMap[upgrade]).textContent = cost;
            
            // Disable button if not enough gems
            const btnMap = {
                damageMultiplier: 'buyGemDamage',
                healthMultiplier: 'buyGemHealth',
                goldMultiplier: 'buyGemGold',
                xpMultiplier: 'buyGemXP',
                critChance: 'buyGemCrit',
                healthRegen: 'buyGemRegen'
            };
            const btn = document.getElementById(btnMap[upgrade]);
            if (this.permStats.gems < cost) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
        
        // Update kill upgrade costs
        const killCosts = {
            damage: 50 + this.permStats.bonusDamage * 25,
            health: 100 + this.permStats.bonusHealth * 50,
            click: 75 + this.permStats.bonusClickDamage * 35,
            gold: 150 + this.permStats.bonusStartGold * 75
        };
        
        document.getElementById('permDamageCost').textContent = killCosts.damage;
        document.getElementById('permHealthCost').textContent = killCosts.health;
        document.getElementById('permClickCost').textContent = killCosts.click;
        document.getElementById('permGoldCost').textContent = killCosts.gold;
        
        // Disable kill upgrade buttons if not enough kills
        ['damage', 'health', 'click', 'gold'].forEach(type => {
            const btn = document.getElementById(`buyPerm${type.charAt(0).toUpperCase() + type.slice(1)}`);
            if (this.permStats.totalKills < killCosts[type]) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }
    
    buyGemUpgrade(upgradeType, baseCost) {
        const level = this.permStats.gemUpgrades[upgradeType];
        const cost = Math.floor(baseCost * Math.pow(1.1, level));
        
        if (this.permStats.gems >= cost) {
            this.permStats.gems -= cost;
            this.permStats.gemUpgrades[upgradeType]++;
            this.savePermanentStats();
            this.updateGemShopPanel();
            this.updateUI();
            this.playSound('powerUp');
            
            const upgradeNames = {
                damageMultiplier: 'Damage Multiplier',
                healthMultiplier: 'Health Multiplier',
                goldMultiplier: 'Gold Multiplier',
                xpMultiplier: 'XP Multiplier',
                critChance: 'Critical Strike',
                healthRegen: 'Health Regeneration'
            };
            this.showMessage(`Purchased ${upgradeNames[upgradeType]}!`, '#00ff00');
        } else {
            this.showMessage('Not enough gems!', '#ff4444');
            this.playSound('error');
        }
    }
    
    updatePermUpgradesPanel() {
        document.getElementById('totalKills').textContent = this.permStats.totalKills;
        document.getElementById('permBonusDamage').textContent = '+' + this.permStats.bonusDamage;
        document.getElementById('permBonusHealth').textContent = '+' + this.permStats.bonusHealth;
        document.getElementById('permBonusClick').textContent = '+' + this.permStats.bonusClickDamage;
        document.getElementById('permBonusGold').textContent = '+' + this.permStats.bonusStartGold;
        
        // Update costs and button states
        const costs = {
            damage: 50 + this.permStats.bonusDamage * 25,
            health: 100 + this.permStats.bonusHealth * 50,
            click: 75 + this.permStats.bonusClickDamage * 35,
            gold: 150 + this.permStats.bonusStartGold * 75
        };
        
        document.getElementById('permDamageCost').textContent = costs.damage;
        document.getElementById('permHealthCost').textContent = costs.health;
        document.getElementById('permClickCost').textContent = costs.click;
        document.getElementById('permGoldCost').textContent = costs.gold;
        
        // Disable buttons if not enough kills
        ['damage', 'health', 'click', 'gold'].forEach(type => {
            const btn = document.getElementById(`buyPerm${type.charAt(0).toUpperCase() + type.slice(1)}`);
            if (this.permStats.totalKills < costs[type]) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }
    
    buyPermUpgrade(type) {
        const costs = {
            damage: 50 + this.permStats.bonusDamage * 25,
            health: 100 + this.permStats.bonusHealth * 50,
            click: 75 + this.permStats.bonusClickDamage * 35,
            gold: 150 + this.permStats.bonusStartGold * 75
        };
        
        const cost = costs[type];
        
        if (this.permStats.totalKills < cost) {
            this.showMessage('Not enough total kills!', '#ff4444');
            return;
        }
        
        this.permStats.totalKills -= cost;
        
        switch(type) {
            case 'damage':
                this.permStats.bonusDamage += 2;
                this.tower.damage += 2;
                break;
            case 'health':
                this.permStats.bonusHealth += 20;
                this.tower.maxHealth += 20;
                this.tower.health += 20;
                break;
            case 'click':
                this.permStats.bonusClickDamage += 1;
                this.clickDamage += 1;
                break;
            case 'gold':
                this.permStats.bonusStartGold += 50;
                this.gold += 50;
                break;
        }
        
        this.savePermanentStats();
        this.updateGemShopPanel();
        this.showMessage('Permanent Upgrade Purchased! ✓', '#00ff00');
        this.playSound('powerUp');
    }
    
    openThemesPanel() {
        document.getElementById('themesBackdrop').classList.add('active');
        document.getElementById('themesPanel').classList.add('active');
        this.updateThemesPanel();
    }
    
    closeThemesPanel() {
        document.getElementById('themesBackdrop').classList.remove('active');
        document.getElementById('themesPanel').classList.remove('active');
    }
    
    updateThemesPanel() {
        document.getElementById('themesGemsAmount').textContent = this.permStats.gems;
        
        const themesGrid = document.getElementById('themesGrid');
        themesGrid.innerHTML = '';
        
        const themes = this.getThemes();
        const unlockedThemes = this.permStats.themes.unlocked;
        const currentTheme = this.permStats.themes.current;
        
        Object.entries(themes).forEach(([key, theme]) => {
            const isUnlocked = unlockedThemes.includes(key);
            const isCurrent = currentTheme === key;
            const canUnlock = this.checkThemeUnlock(key);
            
            const themeCard = document.createElement('div');
            themeCard.className = 'theme-card';
            if (isCurrent) themeCard.classList.add('current');
            if (!isUnlocked) themeCard.classList.add('locked');
            
            // Get requirement text
            let requirementText = '';
            if (!isUnlocked && theme.requirement) {
                const achievement = this.achievements.find(a => a.id === theme.requirement);
                requirementText = achievement ? `<div class="theme-requirement ${canUnlock ? 'met' : 'unmet'}">
                    ${canUnlock ? '✓' : '🔒'} ${achievement.name}
                </div>` : '';
            }
            
            themeCard.innerHTML = `
                <div class="theme-preview" style="background: ${theme.colors.background}; border-color: ${theme.colors.primary};">
                    <div class="theme-colors">
                        <span style="background: ${theme.colors.primary};"></span>
                        <span style="background: ${theme.colors.secondary};"></span>
                        <span style="background: ${theme.colors.success};"></span>
                    </div>
                </div>
                <div class="theme-name">${theme.name}</div>
                <div class="theme-desc">${theme.description}</div>
                ${requirementText}
                ${isCurrent ? '<div class="theme-current">✓ ACTIVE</div>' : ''}
                ${!isUnlocked ? `<div class="theme-cost">💎 ${theme.cost} gems</div>` : ''}
                ${isUnlocked && !isCurrent ? '<button class="theme-apply-btn">APPLY</button>' : ''}
                ${!isUnlocked && canUnlock ? '<button class="theme-unlock-btn">UNLOCK</button>' : ''}
            `;
            
            // Add click handlers
            if (isUnlocked && !isCurrent) {
                themeCard.querySelector('.theme-apply-btn').addEventListener('click', () => {
                    this.applyTheme(key);
                    this.updateThemesPanel();
                });
            }
            
            if (!isUnlocked && canUnlock) {
                themeCard.querySelector('.theme-unlock-btn').addEventListener('click', () => {
                    this.unlockTheme(key);
                });
            }
            
            themesGrid.appendChild(themeCard);
        });
    }
    
    openStatsPanel() {
        document.getElementById('statsBackdrop').classList.add('active');
        document.getElementById('statsPanel').classList.add('active');
        this.updateStatsPanel();
    }
    
    closeStatsPanel() {
        document.getElementById('statsBackdrop').classList.remove('active');
        document.getElementById('statsPanel').classList.remove('active');
    }
    
    updateStatsPanel() {
        document.getElementById('statTotalKills').textContent = this.permStats.totalKills.toLocaleString();
        document.getElementById('statTotalDamage').textContent = this.permStats.totalDamageDealt.toLocaleString();
        document.getElementById('statTotalClicks').textContent = this.permStats.totalClicks.toLocaleString();
        document.getElementById('statHighestWave').textContent = this.permStats.highestWave;
        document.getElementById('statTotalGames').textContent = this.permStats.totalGamesPlayed;
        document.getElementById('statTotalGold').textContent = this.permStats.totalGoldEarned.toLocaleString();
        document.getElementById('statBossesKilled').textContent = this.permStats.bossesKilled;
        
        // Calculate averages
        const gamesPlayed = this.permStats.totalGamesPlayed || 1;
        const avgKills = Math.floor(this.permStats.totalKills / gamesPlayed);
        const avgDamage = Math.floor(this.permStats.totalDamageDealt / gamesPlayed);
        const avgWave = Math.floor(this.permStats.highestWave / gamesPlayed);
        
        document.getElementById('statAvgKills').textContent = avgKills;
        document.getElementById('statAvgDamage').textContent = avgDamage.toLocaleString();
        document.getElementById('statAvgWave').textContent = avgWave;
    }
    
    openAchievementsPanel() {
        console.log('Opening achievements panel...');
        const backdrop = document.getElementById('achievementsBackdrop');
        const panel = document.getElementById('achievementsPanel');
        console.log('Achievements panel:', panel);
        console.log('Achievements array:', this.achievements);
        if (panel && backdrop) {
            backdrop.classList.add('active');
            panel.classList.add('active');
            this.updateAchievementsPanel();
        } else {
            console.error('Achievements panel not found!');
        }
    }
    
    closeAchievementsPanel() {
        document.getElementById('achievementsBackdrop').classList.remove('active');
        document.getElementById('achievementsPanel').classList.remove('active');
    }
    
    openEnemyTypesPanel() {
        document.getElementById('enemyTypesBackdrop').classList.add('active');
        document.getElementById('enemyTypesPanel').classList.add('active');
        this.updateEnemyTypesPanel();
    }
    
    closeEnemyTypesPanel() {
        document.getElementById('enemyTypesBackdrop').classList.remove('active');
        document.getElementById('enemyTypesPanel').classList.remove('active');
    }
    
    openChallengesPanel() {
        const backdrop = document.getElementById('challengesBackdrop');
        const panel = document.getElementById('challengesPanel');
        if (!backdrop || !panel) return; // Safety check
        
        backdrop.classList.add('active');
        panel.classList.add('active');
        this.updateChallengesPanel();
    }
    
    closeChallengesPanel() {
        const backdrop = document.getElementById('challengesBackdrop');
        const panel = document.getElementById('challengesPanel');
        if (!backdrop || !panel) return; // Safety check
        
        backdrop.classList.remove('active');
        panel.classList.remove('active');
    }
    
    openLeaderboardsPanel() {
        const backdrop = document.getElementById('leaderboardsBackdrop');
        const panel = document.getElementById('leaderboardsPanel');
        if (!backdrop || !panel) return; // Safety check
        
        backdrop.classList.add('active');
        panel.classList.add('active');
        this.updateLeaderboardsPanel();
    }
    
    closeLeaderboardsPanel() {
        const backdrop = document.getElementById('leaderboardsBackdrop');
        const panel = document.getElementById('leaderboardsPanel');
        if (!backdrop || !panel) return; // Safety check
        
        backdrop.classList.remove('active');
        panel.classList.remove('active');
    }
    
    updateEnemyTypesPanel() {
        // Update kill counts for each zombie type
        document.getElementById('killsNormal').textContent = this.permStats.zombieKills.normal;
        document.getElementById('killsStrong').textContent = this.permStats.zombieKills.strong;
        document.getElementById('killsRunner').textContent = this.permStats.zombieKills.runner;
        document.getElementById('killsTank').textContent = this.permStats.zombieKills.tank;
        document.getElementById('killsExploder').textContent = this.permStats.zombieKills.exploder;
        document.getElementById('killsBoss').textContent = this.permStats.zombieKills.boss;
    }
    
    updateChallengesPanel() {
        const container = document.getElementById('challengesList');
        if (!container) return; // Safety check
        
        container.innerHTML = '';
        
        this.dailyChallenges.forEach(challenge => {
            const challengeEl = document.createElement('div');
            challengeEl.className = `challenge-card ${challenge.completed ? 'completed' : ''}`;
            
            let progressText = '';
            if (challenge.completed) {
                progressText = '<div class="challenge-status completed">✓ COMPLETED</div>';
            } else {
                progressText = '<div class="challenge-status in-progress">In Progress...</div>';
            }
            
            challengeEl.innerHTML = `
                <h3>${challenge.name}</h3>
                <p>${challenge.description}</p>
                <p class="challenge-reward">Reward: +${challenge.reward} Total Kills</p>
                ${progressText}
            `;
            
            container.appendChild(challengeEl);
        });
    }
    
    updateLeaderboardsPanel() {
        // Update Highest Wave Leaderboard
        const waveContainer = document.getElementById('leaderboardWave');
        if (!waveContainer) return; // Safety check
        
        waveContainer.innerHTML = '';
        this.leaderboards.highestWave.forEach((entry, index) => {
            const entryEl = document.createElement('div');
            entryEl.className = `leaderboard-entry rank-${index + 1}`;
            entryEl.innerHTML = `
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-name">${entry.name}</span>
                <span class="leaderboard-score">Wave ${entry.score}</span>
                <span class="leaderboard-date">${entry.date}</span>
            `;
            waveContainer.appendChild(entryEl);
        });
        
        // Update Most Kills Leaderboard
        const killsContainer = document.getElementById('leaderboardKills');
        if (!killsContainer) return; // Safety check
        
        killsContainer.innerHTML = '';
        this.leaderboards.mostKills.forEach((entry, index) => {
            const entryEl = document.createElement('div');
            entryEl.className = `leaderboard-entry rank-${index + 1}`;
            entryEl.innerHTML = `
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-name">${entry.name}</span>
                <span class="leaderboard-score">${entry.score} Kills</span>
                <span class="leaderboard-date">${entry.date}</span>
            `;
            killsContainer.appendChild(entryEl);
        });
        
        // Update Fastest to Wave 20 Leaderboard
        const speedContainer = document.getElementById('leaderboardSpeed');
        if (!speedContainer) return; // Safety check
        
        speedContainer.innerHTML = '';
        this.leaderboards.fastestToWave20.forEach((entry, index) => {
            const entryEl = document.createElement('div');
            entryEl.className = `leaderboard-entry rank-${index + 1}`;
            entryEl.innerHTML = `
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-name">${entry.name}</span>
                <span class="leaderboard-score">${this.formatTime(entry.score)}</span>
                <span class="leaderboard-date">${entry.date}</span>
            `;
            speedContainer.appendChild(entryEl);
        });
    }
    
    updateAchievementsPanel() {
        const container = document.getElementById('achievementsList');
        container.innerHTML = '';
        
        this.achievements.forEach(achievement => {
            const achievementEl = document.createElement('div');
            achievementEl.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            
            const progress = this.permStats[achievement.stat] || 0;
            const percentage = Math.min(100, Math.floor((progress / achievement.requirement) * 100));
            
            const gemReward = achievement.gemReward || 0;
            achievementEl.innerHTML = `
                <div class="achievement-icon-large">${achievement.unlocked ? achievement.icon : '🔒'}</div>
                <div class="achievement-content">
                    <div class="achievement-header">
                        <span class="achievement-name">${achievement.name}</span>
                        ${achievement.unlocked ? '<span class="achievement-unlocked-badge">✓</span>' : ''}
                    </div>
                    <div class="achievement-desc">${achievement.desc}</div>
                    ${gemReward > 0 ? `<div class="achievement-gem-reward">💎 Reward: ${gemReward} Gems</div>` : ''}
                    <div class="achievement-progress-bar">
                        <div class="achievement-progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="achievement-progress-text">${progress.toLocaleString()} / ${achievement.requirement.toLocaleString()}</div>
                </div>
            `;
            
            container.appendChild(achievementEl);
        });
        
        // Update achievements count
        const unlocked = this.achievements.filter(a => a.unlocked).length;
        const total = this.achievements.length;
        document.getElementById('achievementsCount').textContent = `${unlocked} / ${total} Unlocked`;
    }
    
    // ==========================================
    // TITLE SCREEN & NAME INPUT
    // ==========================================
    
    showNameInput() {
        document.getElementById('titleScreen').classList.remove('active');
        document.getElementById('nameInputScreen').classList.add('active');
        document.getElementById('playerNameInput').value = '';
        document.getElementById('playerNameInput').focus();
    }
    
    confirmPlayerName() {
        const nameInput = document.getElementById('playerNameInput');
        const playerName = nameInput.value.trim();
        
        if (playerName.length === 0) {
            alert('Please enter a name!');
            return;
        }
        
        if (playerName.length < 2) {
            alert('Name must be at least 2 characters long!');
            return;
        }
        
        // Save player name
        localStorage.setItem('playerName', playerName);
        
        // Reset to slot 1 for new player and clear any existing permanent stats
        this.currentSlot = 1;
        localStorage.setItem('currentSlot', '1');
        
        // Initialize fresh permanent stats for new player
        this.permStats = {
            totalKills: 0,
            bonusDamage: 0,
            bonusHealth: 0,
            bonusClickDamage: 0,
            bonusStartGold: 0,
            totalDamageDealt: 0,
            totalClicks: 0,
            highestWave: 0,
            totalGamesPlayed: 0,
            totalGoldEarned: 0,
            bossesKilled: 0,
            zombieKills: {
                normal: 0,
                strong: 0,
                runner: 0,
                tank: 0,
                exploder: 0,
                boss: 0
            }
        };
        this.savePermanentStats();
        
        // Re-apply bonuses (which will be zero for new player)
        this.applyPermanentBonuses();
        
        // Hide name input, show main menu
        document.getElementById('nameInputScreen').classList.remove('active');
        document.getElementById('mainMenu').classList.add('active');
        document.getElementById('currentPlayerName').textContent = `Player: ${playerName}`;
        
        this.showMessage(`Welcome, ${playerName}! 👋`, '#00ff00');
    }
    
    cancelNameInput() {
        document.getElementById('nameInputScreen').classList.remove('active');
        document.getElementById('titleScreen').classList.add('active');
    }
    
    // ==========================================
    // DAILY CHALLENGES
    // ==========================================
    
    loadDailyChallenges() {
        const today = new Date().toDateString();
        const saved = localStorage.getItem('dailyChallenges');
        
        // Define the challenge templates with check functions
        const challengeTemplates = [
            {
                id: 1,
                name: "No Upgrades Challenge",
                description: "Survive 10 waves without using any upgrades",
                goal: 10,
                progress: 0,
                completed: false,
                reward: 100,
                check: () => this.wave >= 10 && this.challengeTracking.upgradesUsed === 0
            },
            {
                id: 2,
                name: "Click Master",
                description: "Kill 100 zombies using only click damage",
                goal: 100,
                progress: 0,
                completed: false,
                reward: 150,
                check: () => this.challengeTracking.clickKills >= 100
            },
            {
                id: 3,
                name: "Untouchable",
                description: "Beat wave 15 without taking any damage",
                goal: 15,
                progress: 0,
                completed: false,
                reward: 200,
                check: () => this.wave >= 15 && this.challengeTracking.damageTaken === 0
            }
        ];
        
        if (saved) {
            const data = JSON.parse(saved);
            // Check if challenges are from today
            if (data.date === today) {
                // Restore challenges and add check functions back
                this.dailyChallenges = data.challenges.map((savedChallenge, index) => {
                    return {
                        ...savedChallenge,
                        check: challengeTemplates[index].check
                    };
                });
                return;
            }
        }
        
        // Generate new challenges for today
        this.dailyChallenges = challengeTemplates;
        this.saveDailyChallenges();
    }
    
    saveDailyChallenges() {
        const today = new Date().toDateString();
        localStorage.setItem('dailyChallenges', JSON.stringify({
            date: today,
            challenges: this.dailyChallenges
        }));
    }
    
    checkDailyChallenges() {
        this.dailyChallenges.forEach(challenge => {
            try {
                if (!challenge.completed && challenge.check && challenge.check()) {
                    challenge.completed = true;
                    challenge.progress = challenge.goal;
                    this.permStats.totalKills += challenge.reward;
                    this.showMessage(`🏆 Challenge Complete! +${challenge.reward} Total Kills!`, '#ffd700');
                    this.saveDailyChallenges();
                    this.savePermanentStats();
                }
            } catch (error) {
                console.error('Error checking challenge:', challenge.name, error);
            }
        });
    }
    
    // ==========================================
    // LEADERBOARDS
    // ==========================================
    
    loadLeaderboards() {
        const saved = localStorage.getItem('leaderboards');
        
        if (saved) {
            this.leaderboards = JSON.parse(saved);
        } else {
            this.leaderboards = {
                highestWave: [],
                mostKills: [],
                fastestToWave20: []
            };
        }
    }
    
    saveLeaderboards() {
        localStorage.setItem('leaderboards', JSON.stringify(this.leaderboards));
    }
    
    updateLeaderboards() {
        const playerName = localStorage.getItem('playerName') || 'Player';
        const currentDate = new Date().toLocaleDateString();
        
        // Highest Wave
        const waveEntry = {
            name: playerName,
            score: this.wave,
            date: currentDate
        };
        this.leaderboards.highestWave.push(waveEntry);
        this.leaderboards.highestWave.sort((a, b) => b.score - a.score);
        this.leaderboards.highestWave = this.leaderboards.highestWave.slice(0, 10);
        
        // Most Kills
        const killsEntry = {
            name: playerName,
            score: this.kills,
            date: currentDate
        };
        this.leaderboards.mostKills.push(killsEntry);
        this.leaderboards.mostKills.sort((a, b) => b.score - a.score);
        this.leaderboards.mostKills = this.leaderboards.mostKills.slice(0, 10);
        
        // Fastest to Wave 20
        if (this.wave >= 20 && this.runStartTime) {
            const timeElapsed = Math.floor((Date.now() - this.runStartTime) / 1000);
            const timeEntry = {
                name: playerName,
                score: timeElapsed,
                date: currentDate
            };
            this.leaderboards.fastestToWave20.push(timeEntry);
            this.leaderboards.fastestToWave20.sort((a, b) => a.score - b.score);
            this.leaderboards.fastestToWave20 = this.leaderboards.fastestToWave20.slice(0, 10);
        }
        
        this.saveLeaderboards();
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // ==========================================
    // SETTINGS
    // ==========================================
    
    loadSettings() {
        const saved = localStorage.getItem('gameSettings');
        
        if (saved) {
            this.settings = JSON.parse(saved);
        } else {
            this.settings = {
                volume: 50,
                soundEnabled: true,
                graphicsQuality: 'medium',
                particlesEnabled: true,
                screenShakeEnabled: true
            };
        }
        
        // Apply settings
        this.applySettingsToGame();
    }
    
    saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(this.settings));
    }
    
    openSettingsPanel() {
        document.getElementById('settingsBackdrop').classList.add('active');
        document.getElementById('settingsPanel').classList.add('active');
        this.updateSettingsPanel();
    }
    
    closeSettingsPanel() {
        document.getElementById('settingsBackdrop').classList.remove('active');
        document.getElementById('settingsPanel').classList.remove('active');
    }
    
    updateSettingsPanel() {
        // Update volume slider
        document.getElementById('volumeSlider').value = this.settings.volume;
        document.getElementById('volumeValue').textContent = this.settings.volume + '%';
        
        // Update sound toggle
        const soundBtn = document.getElementById('soundToggleBtn');
        if (this.settings.soundEnabled) {
            soundBtn.classList.remove('off');
            soundBtn.textContent = 'ON';
        } else {
            soundBtn.classList.add('off');
            soundBtn.textContent = 'OFF';
        }
        
        // Update voice toggle
        const voiceBtn = document.getElementById('voiceToggleBtn');
        if (this.ttsEnabled) {
            voiceBtn.classList.remove('off');
            voiceBtn.textContent = 'ON';
        } else {
            voiceBtn.classList.add('off');
            voiceBtn.textContent = 'OFF';
        }
        
        // Update graphics
        document.getElementById('graphicsSelect').value = this.settings.graphicsQuality;
        
        // Update particles toggle
        const particlesBtn = document.getElementById('particlesToggleBtn');
        if (this.settings.particlesEnabled) {
            particlesBtn.classList.remove('off');
            particlesBtn.textContent = 'ON';
        } else {
            particlesBtn.classList.add('off');
            particlesBtn.textContent = 'OFF';
        }
        
        // Update screen shake toggle
        const shakeBtn = document.getElementById('screenShakeToggleBtn');
        if (this.settings.screenShakeEnabled) {
            shakeBtn.classList.remove('off');
            shakeBtn.textContent = 'ON';
        } else {
            shakeBtn.classList.add('off');
            shakeBtn.textContent = 'OFF';
        }
    }
    
    applySettings() {
        // Get values from UI
        this.settings.volume = parseInt(document.getElementById('volumeSlider').value);
        this.settings.soundEnabled = !document.getElementById('soundToggleBtn').classList.contains('off');
        this.ttsEnabled = !document.getElementById('voiceToggleBtn').classList.contains('off');
        this.settings.graphicsQuality = document.getElementById('graphicsSelect').value;
        this.settings.particlesEnabled = !document.getElementById('particlesToggleBtn').classList.contains('off');
        this.settings.screenShakeEnabled = !document.getElementById('screenShakeToggleBtn').classList.contains('off');
        
        // Save settings
        localStorage.setItem('ttsEnabled', this.ttsEnabled);
        this.saveSettings();
        
        // Apply to game
        this.applySettingsToGame();
        
        // Close panel
        this.closeSettingsPanel();
        
        // Show confirmation
        this.showNarration('✓ Settings Applied!', 2000);
    }
    
    applySettingsToGame() {
        // Apply volume (affects sound system)
        if (this.audioContext) {
            // Volume would be applied through gain nodes if using Web Audio API
        }
        
        // Apply sound enabled
        this.soundEnabled = this.settings.soundEnabled;
        
        // Update sound toggle button display
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        }
    }
}

// Start game
window.addEventListener('load', () => {
    new TowerDefenseGame();
});
