// Game State
const game = {
    // Three.js objects
    scene: null,
    camera: null,
    renderer: null,
    
    // Game objects
    organs: {},
    particles: [],
    
    // Current state
    currentOperation: null,
    currentTool: 'scalpel',
    currentTaskIndex: 0,
    tasks: [],
    
    // Patient vitals
    patient: {
        health: 100,
        oxygen: 100,
        blood: 100
    },
    
    // Game stats
    timer: 0,
    startTime: 0,
    accuracy: 100,
    mistakes: 0,
    
    // Interaction
    isPerformingAction: false,
    actionProgress: 0,
    interactionTarget: null,
    
    // Three.js helpers
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    
    // Audio context
    audioContext: null
};

// Operations database
const OPERATIONS = {
    appendix: {
        name: 'Аппендэктомия',
        duration: 300, // 5 minutes
        xp: 100,
        organType: 'appendix',
        tasks: [
            { tool: 'syringe', text: 'Введите анестезию в область операции', target: 'body', actionTime: 2 },
            { tool: 'scalpel', text: 'Сделайте разрез в правой подвздошной области', target: 'body', actionTime: 3 },
            { tool: 'forceps', text: 'Отведите ткани и обнажьте аппендикс', target: 'appendix', actionTime: 2 },
            { tool: 'cautery', text: 'Остановите кровотечение коагулятором', target: 'appendix', actionTime: 2 },
            { tool: 'forceps', text: 'Удалите воспалённый аппендикс', target: 'appendix', actionTime: 3, removeOrgan: true },
            { tool: 'suture', text: 'Наложите швы на операционную рану', target: 'body', actionTime: 3 }
        ]
    },
    tumor: {
        name: 'Удаление опухоли',
        duration: 420, // 7 minutes
        xp: 250,
        organType: 'tumor',
        tasks: [
            { tool: 'syringe', text: 'Введите контрастное вещество для визуализации', target: 'body', actionTime: 2 },
            { tool: 'scalpel', text: 'Выполните точный разрез над опухолью', target: 'body', actionTime: 3 },
            { tool: 'forceps', text: 'Аккуратно отделите опухоль от тканей', target: 'tumor', actionTime: 4 },
            { tool: 'cautery', text: 'Коагулируйте питающие сосуды опухоли', target: 'tumor', actionTime: 3 },
            { tool: 'scalpel', text: 'Иссеките опухоль с краем здоровой ткани', target: 'tumor', actionTime: 3 },
            { tool: 'forceps', text: 'Извлеките удалённую опухоль', target: 'tumor', actionTime: 2, removeOrgan: true },
            { tool: 'suture', text: 'Ушейте операционную рану послойно', target: 'body', actionTime: 4 }
        ]
    },
    heart: {
        name: 'Операция на сердце',
        duration: 600, // 10 minutes
        xp: 500,
        organType: 'heart',
        tasks: [
            { tool: 'syringe', text: 'Подключите аппарат ИК и введите гепарин', target: 'body', actionTime: 3 },
            { tool: 'scalpel', text: 'Выполните срединную стернотомию', target: 'body', actionTime: 4 },
            { tool: 'forceps', text: 'Раздвиньте грудину ретрактором', target: 'body', actionTime: 3 },
            { tool: 'cautery', text: 'Остановите кровотечение из межрёберных артерий', target: 'body', actionTime: 3 },
            { tool: 'syringe', text: 'Введите кардиоплегический раствор', target: 'heart', actionTime: 2 },
            { tool: 'scalpel', text: 'Вскройте перикард и обнажьте сердце', target: 'heart', actionTime: 3 },
            { tool: 'forceps', text: 'Удалите тромб из коронарной артерии', target: 'heart', actionTime: 4 },
            { tool: 'suture', text: 'Наложите шов на миокард', target: 'heart', actionTime: 4 },
            { tool: 'cautery', text: 'Коагулируйте мелкие сосуды миокарда', target: 'heart', actionTime: 2 },
            { tool: 'suture', text: 'Закройте грудную клетку', target: 'body', actionTime: 5 }
        ]
    }
};

// Initialize Three.js scene
function initThreeJS() {
    const canvas = document.getElementById('canvas3d');
    
    // Scene
    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(0x0a0e1a);
    game.scene.fog = new THREE.Fog(0x0a0e1a, 8, 25);
    
    // Camera
    game.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    game.camera.position.set(0, 4, 7);
    game.camera.lookAt(0, 0, 0);
    
    // Renderer
    game.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false
    });
    game.renderer.setSize(window.innerWidth, window.innerHeight);
    game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    game.renderer.shadowMap.enabled = true;
    game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404876, 0.5);
    game.scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
    mainLight.position.set(4, 8, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 512;
    mainLight.shadow.mapSize.height = 512;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    game.scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x6688ff, 0.3);
    fillLight.position.set(-4, 4, -4);
    game.scene.add(fillLight);
    
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 10, 0);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.3;
    spotLight.castShadow = true;
    game.scene.add(spotLight);
    
    // Create operating room
    createOperatingRoom();
    createPatient();
    
    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Start rendering
    renderMenuScene();
}

// Create operating room environment
function createOperatingRoom() {
    // Operating table
    const tableGeometry = new THREE.BoxGeometry(5, 0.2, 2.5);
    const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x506070,
        metalness: 0.5,
        roughness: 0.5
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = -0.8;
    table.receiveShadow = true;
    table.castShadow = true;
    game.scene.add(table);
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a2030,
        roughness: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    game.scene.add(floor);
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x2a3a5a, 0x1a2a3a);
    gridHelper.position.y = -0.99;
    game.scene.add(gridHelper);
}

// Create patient body
function createPatient() {
    // Torso
    const torsoGeometry = new THREE.BoxGeometry(1.8, 0.7, 2.5);
    const skinMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4a574,
        roughness: 0.8,
        metalness: 0.1
    });
    const torso = new THREE.Mesh(torsoGeometry, skinMaterial);
    torso.position.set(0, 0, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.name = 'body';
    game.scene.add(torso);
    game.organs.body = torso;
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.45, 16, 16);
    const head = new THREE.Mesh(headGeometry, skinMaterial.clone());
    head.position.set(0, 0.6, -1.5);
    head.scale.set(1, 1.1, 1);
    head.castShadow = true;
    head.receiveShadow = true;
    game.scene.add(head);
}

// Create specific organ for operation
function createOrgan(type) {
    let organMesh = null;
    
    switch(type) {
        case 'appendix':
            const appendixGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8);
            const appendixMaterial = new THREE.MeshStandardMaterial({
                color: 0xff6666,
                roughness: 0.7
            });
            organMesh = new THREE.Mesh(appendixGeometry, appendixMaterial);
            organMesh.position.set(0.7, -0.1, 0.4);
            organMesh.rotation.z = Math.PI / 7;
            break;
            
        case 'tumor':
            const tumorGeometry = new THREE.SphereGeometry(0.35, 16, 16);
            const tumorMaterial = new THREE.MeshStandardMaterial({
                color: 0xaa3333,
                roughness: 0.6
            });
            organMesh = new THREE.Mesh(tumorGeometry, tumorMaterial);
            organMesh.position.set(-0.4, 0.15, 0.2);
            break;
            
        case 'heart':
            const heartGeometry = new THREE.SphereGeometry(0.45, 16, 16);
            const heartMaterial = new THREE.MeshStandardMaterial({
                color: 0xcc4444,
                roughness: 0.5,
                emissive: 0x331111,
                emissiveIntensity: 0.2
            });
            organMesh = new THREE.Mesh(heartGeometry, heartMaterial);
            organMesh.position.set(-0.2, 0.15, -0.2);
            organMesh.scale.set(1, 1.2, 0.9);
            organMesh.userData.pulsePhase = 0;
            break;
    }
    
    if (organMesh) {
        organMesh.castShadow = true;
        organMesh.receiveShadow = true;
        organMesh.name = type;
        game.scene.add(organMesh);
        game.organs[type] = organMesh;
    }
}

// Window resize handler
function onWindowResize() {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Menu scene rendering (idle animation)
function renderMenuScene() {
    if (game.currentOperation) return;
    
    const time = Date.now() * 0.0003;
    game.camera.position.x = Math.sin(time) * 1.5;
    game.camera.position.z = 7 + Math.cos(time) * 1;
    game.camera.lookAt(0, 0, 0);
    
    game.renderer.render(game.scene, game.camera);
    requestAnimationFrame(renderMenuScene);
}

// Start operation
function startOperation(operationType) {
    const operation = OPERATIONS[operationType];
    if (!operation) return;
    
    // Set up game state
    game.currentOperation = operation;
    game.tasks = [...operation.tasks];
    game.currentTaskIndex = 0;
    game.timer = operation.duration;
    game.startTime = Date.now();
    game.patient = { health: 100, oxygen: 100, blood: 100 };
    game.accuracy = 100;
    game.mistakes = 0;
    game.actionProgress = 0;
    
    // Create organ
    createOrgan(operation.organType);
    
    // Switch screens
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('gameHUD').classList.remove('hidden');
    
    // Update UI
    updateTaskDisplay();
    updateVitalsDisplay();
    
    // Start game loop
    gameLoop();
}

// Update current task display
function updateTaskDisplay() {
    if (game.currentTaskIndex >= game.tasks.length) {
        completeOperation();
        return;
    }
    
    const task = game.tasks[game.currentTaskIndex];
    document.getElementById('taskText').textContent = task.text;
    document.getElementById('currentStage').textContent = 
        `${game.currentTaskIndex + 1}/${game.tasks.length}`;
    document.getElementById('taskProgress').style.width = '0%';
}

// Update vitals display
function updateVitalsDisplay() {
    const health = Math.max(0, Math.min(100, game.patient.health));
    const oxygen = Math.max(0, Math.min(100, game.patient.oxygen));
    const blood = Math.max(0, Math.min(100, game.patient.blood));
    
    document.getElementById('healthBar').style.width = health + '%';
    document.getElementById('healthValue').textContent = Math.round(health) + '%';
    
    document.getElementById('oxygenBar').style.width = oxygen + '%';
    document.getElementById('oxygenValue').textContent = Math.round(oxygen) + '%';
    
    document.getElementById('bloodBar').style.width = blood + '%';
    document.getElementById('bloodValue').textContent = Math.round(blood) + '%';
    
    document.getElementById('accuracy').textContent = Math.round(game.accuracy) + '%';
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(game.timer / 60);
    const seconds = Math.floor(game.timer % 60);
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update patient vitals (degradation over time)
function updateVitals(deltaTime) {
    // Oxygen decreases slowly
    game.patient.oxygen -= 0.03 * deltaTime;
    
    // Low blood affects health
    if (game.patient.blood < 50) {
        game.patient.health -= 0.05 * deltaTime;
    }
    
    // Low oxygen affects health
    if (game.patient.oxygen < 50) {
        game.patient.health -= 0.04 * deltaTime;
    }
    
    // Clamp values
    game.patient.oxygen = Math.max(0, game.patient.oxygen);
    game.patient.health = Math.max(0, game.patient.health);
    
    // Check for failure
    if (game.patient.health <= 0) {
        failOperation('Пациент умер от критических повреждений');
    }
}

// Complete task
function completeTask() {
    const task = game.tasks[game.currentTaskIndex];
    
    // Apply task effects
    if (task.tool === 'cautery') {
        game.patient.blood = Math.min(100, game.patient.blood + 15);
        playSound(880, 0.2, 'sawtooth');
    } else if (task.tool === 'syringe') {
        game.patient.oxygen = Math.min(100, game.patient.oxygen + 12);
        game.patient.health = Math.min(100, game.patient.health + 5);
        playSound(660, 0.15, 'sine');
    } else if (task.tool === 'scalpel') {
        game.patient.blood -= 8;
        playSound(330, 0.2, 'triangle');
    } else {
        playSound(550, 0.15, 'square');
    }
    
    // Remove organ if needed
    if (task.removeOrgan && game.organs[task.target]) {
        removeOrgan(task.target);
    }
    
    // Create success particles
    createSuccessParticles(task.target);
    
    // Vibration feedback
    if (navigator.vibrate) {
        navigator.vibrate([30, 20, 30]);
    }
    
    // Move to next task
    game.currentTaskIndex++;
    game.actionProgress = 0;
    updateTaskDisplay();
}

// Remove organ with animation
function removeOrgan(organName) {
    const organ = game.organs[organName];
    if (!organ) return;
    
    const startY = organ.position.y;
    const startTime = Date.now();
    const duration = 1000;
    
    function animateRemoval() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            organ.position.y = startY + progress * 3;
            organ.rotation.x += 0.05;
            organ.rotation.y += 0.05;
            organ.material.opacity = 1 - progress;
            organ.material.transparent = true;
            requestAnimationFrame(animateRemoval);
        } else {
            game.scene.remove(organ);
            organ.geometry.dispose();
            organ.material.dispose();
            delete game.organs[organName];
        }
    }
    
    animateRemoval();
}

// Make mistake
function makeMistake() {
    game.mistakes++;
    game.accuracy = Math.max(0, 100 - game.mistakes * 7);
    game.patient.health -= 10;
    
    playSound(150, 0.3, 'sawtooth');
    
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
    
    // Visual feedback
    const canvas = document.getElementById('canvas3d');
    canvas.style.filter = 'hue-rotate(180deg)';
    setTimeout(() => {
        canvas.style.filter = '';
    }, 100);
}

// Create particle effect
function createParticle(position, color) {
    const geometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 4, 4);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
    });
    
    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);
    particle.position.x += (Math.random() - 0.5) * 0.3;
    particle.position.y += (Math.random() - 0.5) * 0.3;
    particle.position.z += (Math.random() - 0.5) * 0.3;
    
    particle.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.08,
            Math.random() * 0.12 + 0.04,
            (Math.random() - 0.5) * 0.08
        ),
        life: 1
    };
    
    game.scene.add(particle);
    game.particles.push(particle);
}

// Create success particles
function createSuccessParticles(targetName) {
    const target = game.organs[targetName];
    if (!target) return;
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            createParticle(target.position, 0x44ff44);
        }, i * 30);
    }
}

// Update particles
function updateParticles(deltaTime) {
    game.particles = game.particles.filter(particle => {
        particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime));
        particle.userData.velocity.y -= 0.003 * deltaTime;
        particle.userData.life -= 0.015 * deltaTime;
        particle.material.opacity = particle.userData.life;
        
        if (particle.userData.life <= 0) {
            game.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
            return false;
        }
        return true;
    });
}

// Complete operation successfully
function completeOperation() {
    game.currentOperation = null;
    
    const elapsed = (Date.now() - game.startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    
    // Calculate grade
    const score = (game.patient.health + game.accuracy) / 2;
    let grade = 'D';
    let gradeClass = '';
    
    if (score >= 95) {
        grade = 'S';
        gradeClass = 'grade-s';
    } else if (score >= 85) {
        grade = 'A';
        gradeClass = 'grade-a';
    } else if (score >= 75) {
        grade = 'B';
        gradeClass = 'grade-b';
    } else if (score >= 65) {
        grade = 'C';
    }
    
    // Show results
    document.getElementById('resultTitle').textContent = 'ОПЕРАЦИЯ УСПЕШНА!';
    document.getElementById('resultTitle').className = 'result-title success';
    document.getElementById('resultGrade').textContent = grade;
    document.getElementById('resultGrade').className = 'result-grade ' + gradeClass;
    document.getElementById('resultTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('resultHealth').textContent = Math.round(game.patient.health) + '%';
    document.getElementById('resultAccuracy').textContent = Math.round(game.accuracy) + '%';
    document.getElementById('resultXP').textContent = `+${OPERATIONS[Object.keys(OPERATIONS).find(key => 
        OPERATIONS[key].name === game.tasks[0]?.text.includes('аппендикс') ? 'appendix' : 
        game.tasks[0]?.text.includes('опухол') ? 'tumor' : 'heart')].xp || 0} XP`;
    
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
    
    // Play success sound
    playSound(523, 0.3, 'sine');
    setTimeout(() => playSound(659, 0.3, 'sine'), 150);
    setTimeout(() => playSound(784, 0.3, 'sine'), 300);
    
    if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50, 30, 100]);
    }
}

// Fail operation
function failOperation(reason) {
    game.currentOperation = null;
    
    const elapsed = (Date.now() - game.startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    
    document.getElementById('resultTitle').textContent = 'ОПЕРАЦИЯ ПРОВАЛЕНА!';
    document.getElementById('resultTitle').className = 'result-title failure';
    document.getElementById('resultGrade').textContent = 'F';
    document.getElementById('resultGrade').className = 'result-grade';
    document.getElementById('resultTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('resultHealth').textContent = Math.round(game.patient.health) + '%';
    document.getElementById('resultAccuracy').textContent = reason;
    document.getElementById('resultXP').textContent = '+0 XP';
    
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
    
    playSound(200, 0.5, 'sawtooth');
    
    if (navigator.vibrate) {
        navigator.vibrate(500);
    }
}

// Main game loop
let lastTime = performance.now();

function gameLoop() {
    if (!game.currentOperation) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 16.67; // Normalize to 60fps
    lastTime = currentTime;
    
    // Update timer
    game.timer -= deltaTime / 60;
    if (game.timer <= 0) {
        failOperation('Время истекло');
        return;
    }
    updateTimerDisplay();
    
    // Update vitals
    updateVitals(deltaTime);
    updateVitalsDisplay();
    
    // Update heart pulse animation
    if (game.organs.heart) {
        game.organs.heart.userData.pulsePhase += 0.08 * deltaTime;
        const scale = 1 + Math.sin(game.organs.heart.userData.pulsePhase) * 0.05;
        game.organs.heart.scale.set(scale, scale * 1.2, scale * 0.9);
    }
    
    // Update particles
    updateParticles(deltaTime);
    
    // Update action progress if performing action
    if (game.isPerformingAction) {
        const task = game.tasks[game.currentTaskIndex];
        if (task) {
            game.actionProgress += (1 / (task.actionTime * 60)) * deltaTime;
            
            if (game.actionProgress >= 1) {
                game.actionProgress = 1;
                completeTask();
                game.isPerformingAction = false;
            }
            
            document.getElementById('taskProgress').style.width = 
                (game.actionProgress * 100) + '%';
                
            // Create particles during action
            if (Math.random() > 0.9) {
                const target = game.organs[task.target];
                if (target) {
                    const colors = {
                        scalpel: 0xff4444,
                        forceps: 0xffaa44,
                        cautery: 0xffff44,
                        syringe: 0x44ffff,
                        suture: 0xffffff
                    };
                    createParticle(target.position, colors[game.currentTool] || 0xffffff);
                }
            }
        }
    }
    
    // Render
    game.renderer.render(game.scene, game.camera);
    requestAnimationFrame(gameLoop);
}

// Play procedural sound
function playSound(frequency, duration, type = 'sine') {
    if (!game.audioContext) {
        game.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = game.audioContext.createOscillator();
    const gainNode = game.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.1;
    
    oscillator.connect(gainNode);
    gainNode.connect(game.audioContext.destination);
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        game.audioContext.currentTime + duration
    );
    oscillator.stop(game.audioContext.currentTime + duration);
}

// Tool selection
document.querySelectorAll('.tool-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        game.currentTool = button.dataset.tool;
        
        playSound(220, 0.1, 'sine');
        if (navigator.vibrate) navigator.vibrate(10);
    });
});

// Input handling
function updateMousePosition(clientX, clientY) {
    game.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    game.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
}

function handleInteractionStart(clientX, clientY) {
    if (!game.currentOperation || game.currentTaskIndex >= game.tasks.length) return;
    
    updateMousePosition(clientX, clientY);
    
    game.raycaster.setFromCamera(game.mouse, game.camera);
    const intersects = game.raycaster.intersectObjects(Object.values(game.organs));
    
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const task = game.tasks[game.currentTaskIndex];
        
        if (clickedObject.name === task.target && game.currentTool === task.tool) {
            game.isPerformingAction = true;
            game.interactionTarget = clickedObject.name;
            game.actionProgress = 0;
        } else {
            makeMistake();
        }
    }
}

function handleInteractionEnd() {
    if (game.isPerformingAction && game.actionProgress < 1) {
        game.isPerformingAction = false;
        game.actionProgress = 0;
        document.getElementById('taskProgress').style.width = '0%';
    }
}

// Touch events
document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleInteractionStart(touch.clientX, touch.clientY);
}, { passive: false });

document.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleInteractionEnd();
}, { passive: false });

// Mouse events
document.addEventListener('mousedown', (e) => {
    handleInteractionStart(e.clientX, e.clientY);
});

document.addEventListener('mouseup', () => {
    handleInteractionEnd();
});

// Operation selection
document.querySelectorAll('.operation-card').forEach(card => {
    card.addEventListener('click', () => {
        const operationType = card.dataset.operation;
        startOperation(operationType);
    });
});

// Back to menu button
document.getElementById('backToMenuBtn').addEventListener('click', () => {
    // Clean up scene
    Object.keys(game.organs).forEach(key => {
        if (key !== 'body') {
            const organ = game.organs[key];
            game.scene.remove(organ);
            organ.geometry.dispose();
            organ.material.dispose();
            delete game.organs[key];
        }
    });
    
    game.particles.forEach(particle => {
        game.scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
    });
    game.particles = [];
    
    // Reset state
    game.currentOperation = null;
    game.currentTaskIndex = 0;
    game.tasks = [];
    game.isPerformingAction = false;
    game.actionProgress = 0;
    
    // Switch screens
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    
    // Resume menu rendering
    renderMenuScene();
});

// Initialize when page loads
window.addEventListener('load', () => {
    initThreeJS();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 1000);
});
