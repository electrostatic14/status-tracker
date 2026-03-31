// Game State
const game = {
    scene: null,
    camera: null,
    renderer: null,
    organs: {},
    particles: [],
    currentOperation: null,
    currentTool: 'scalpel',
    currentTaskIndex: 0,
    tasks: [],
    patient: { health: 100, oxygen: 100, blood: 100 },
    timer: 0,
    startTime: 0,
    accuracy: 100,
    mistakes: 0,
    isPerformingAction: false,
    actionProgress: 0,
    interactionTarget: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    audioContext: null,
    currentOperationType: null,
    isRunning: false
};

// Operations database
const OPERATIONS = {
    appendix: {
        name: 'Аппендэктомия',
        duration: 300,
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
        duration: 420,
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
        duration: 600,
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

// Initialize Three.js
function initThreeJS() {
    const canvas = document.getElementById('canvas3d');
    
    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(0x0a0e1a);
    game.scene.fog = new THREE.Fog(0x0a0e1a, 8, 25);
    
    game.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    game.camera.position.set(0, 4, 7);
    game.camera.lookAt(0, 0, 0);
    
    game.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    game.renderer.setSize(window.innerWidth, window.innerHeight);
    game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    game.renderer.shadowMap.enabled = true;
    game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const ambientLight = new THREE.AmbientLight(0x404876, 0.5);
    game.scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
    mainLight.position.set(4, 8, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    game.scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x6688ff, 0.3);
    fillLight.position.set(-4, 4, -4);
    game.scene.add(fillLight);
    
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 10, 0);
    spotLight.angle = Math.PI / 5;
    game.scene.add(spotLight);
    
    createOperatingRoom();
    createPatient();
    
    window.addEventListener('resize', onWindowResize);
    renderMenuScene();
}

function createOperatingRoom() {
    const tableGeometry = new THREE.BoxGeometry(5, 0.2, 2.5);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x506070, metalness: 0.5, roughness: 0.5 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = -0.8;
    table.receiveShadow = true;
    table.castShadow = true;
    game.scene.add(table);
    
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    game.scene.add(floor);
    
    const gridHelper = new THREE.GridHelper(20, 20, 0x2a3a5a, 0x1a2a3a);
    gridHelper.position.y = -0.99;
    game.scene.add(gridHelper);
}

function createPatient() {
    const torsoGeometry = new THREE.BoxGeometry(1.8, 0.7, 2.5);
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8, metalness: 0.1 });
    const torso = new THREE.Mesh(torsoGeometry, skinMaterial);
    torso.position.set(0, 0, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.name = 'body';
    game.scene.add(torso);
    game.organs.body = torso;
    
    const headGeometry = new THREE.SphereGeometry(0.45, 16, 16);
    const head = new THREE.Mesh(headGeometry, skinMaterial.clone());
    head.position.set(0, 0.6, -1.5);
    head.scale.set(1, 1.1, 1);
    head.castShadow = true;
    game.scene.add(head);
}

function createOrgan(type) {
    let organMesh = null;
    
    switch(type) {
        case 'appendix':
            const appendixGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8);
            const appendixMaterial = new THREE.MeshStandardMaterial({ color: 0xff6666, roughness: 0.7 });
            organMesh = new THREE.Mesh(appendixGeometry, appendixMaterial);
            organMesh.position.set(0.7, -0.1, 0.4);
            organMesh.rotation.z = Math.PI / 7;
            break;
            
        case 'tumor':
            const tumorGeometry = new THREE.SphereGeometry(0.35, 16, 16);
            const tumorMaterial = new THREE.MeshStandardMaterial({ color: 0xaa3333, roughness: 0.6 });
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

function onWindowResize() {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
}

function renderMenuScene() {
    if (game.currentOperation) return;
    
    const time = Date.now() * 0.0003;
    game.camera.position.x = Math.sin(time) * 1.5;
    game.camera.position.z = 7 + Math.cos(time) * 1;
    game.camera.lookAt(0, 0, 0);
    
    game.renderer.render(game.scene, game.camera);
    requestAnimationFrame(renderMenuScene);
}

function startOperation(operationType) {
    const operation = OPERATIONS[operationType];
    if (!operation) return;
    
    // Сброс данных
    game.currentOperation = operation;
    game.currentOperationType = operationType;
    game.tasks = [...operation.tasks];
    game.currentTaskIndex = 0;
    game.timer = operation.duration;
    
    // ВКЛЮЧАЕМ ИГРУ И ВРЕМЯ
    lastTime = performance.now(); 
    game.isRunning = true;
    
    game.startTime = Date.now();
    game.patient = { health: 100, oxygen: 100, blood: 100 };
    game.accuracy = 100;
    game.mistakes = 0;
    game.actionProgress = 0;
    
    createOrgan(operation.organType);
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('gameHUD').classList.remove('hidden');
    
    updateTaskDisplay();
    updateVitalsDisplay();
    
    // Запуск цикла
    gameLoop();
        }

function updateTaskDisplay() {
    if (game.currentTaskIndex >= game.tasks.length) {
        completeOperation();
        return;
    }
    
    const task = game.tasks[game.currentTaskIndex];
    document.getElementById('taskText').textContent = task.text;
    document.getElementById('currentStage').textContent = `${game.currentTaskIndex + 1}/${game.tasks.length}`;
    document.getElementById('taskProgress').style.width = '0%';
}

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

function updateTimerDisplay() {
    const minutes = Math.floor(game.timer / 60);
    const seconds = Math.floor(game.timer % 60);
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateVitals(deltaTime) {
    game.patient.oxygen -= 0.03 * deltaTime;
    
    if (game.patient.blood < 50) {
        game.patient.health -= 0.05 * deltaTime;
    }
    if (game.patient.oxygen < 50) {
        game.patient.health -= 0.04 * deltaTime;
    }
    
    game.patient.oxygen = Math.max(0, game.patient.oxygen);
    game.patient.health = Math.max(0, game.patient.health);
    
    if (game.patient.health <= 0) {
        failOperation('Пациент умер от критических повреждений');
    }
}

function completeTask() {
    const task = game.tasks[game.currentTaskIndex];
    
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
    
    if (task.removeOrgan && game.organs[task.target]) {
        removeOrgan(task.target);
    }
    
    createSuccessParticles(task.target);
    
    if (navigator.vibrate) {
        navigator.vibrate([30, 20, 30]);
    }
    
    game.currentTaskIndex++;
    game.actionProgress = 0;
    updateTaskDisplay();
}

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

function makeMistake() {
    game.mistakes++;
    game.accuracy = Math.max(0, 100 - game.mistakes * 7);
    game.patient.health -= 10;
    
    playSound(150, 0.3, 'sawtooth');
    
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
    
    const canvas = document.getElementById('canvas3d');
    canvas.style.filter = 'hue-rotate(180deg)';
    setTimeout(() => {
        canvas.style.filter = '';
    }, 100);
}

function createParticle(position, color) {
    const geometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 4, 4);
    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
    
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

function createSuccessParticles(targetName) {
    const target = game.organs[targetName];
    if (!target) return;
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            createParticle(target.position, 0x44ff44);
        }, i * 30);
    }
}

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

function completeOperation() {
    game.isRunning = false;
    game.currentOperation = null;
    
    const elapsed = (Date.now() - game.startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    
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
    
    document.getElementById('resultTitle').textContent = 'ОПЕРАЦИЯ УСПЕШНА!';
    document.getElementById('resultTitle').className = 'result-title success';
    document.getElementById('resultGrade').textContent = grade;
    document.getElementById('resultGrade').className = 'result-grade ' + gradeClass;
    document.getElementById('resultTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('resultHealth').textContent = Math.round(game.patient.health) + '%';
    document.getElementById('resultAccuracy').textContent = Math.round(game.accuracy) + '%';
    document.getElementById('resultXP').textContent = `+${OPERATIONS[game.currentOperationType].xp} XP`;
    
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
    
    playSound(523, 0.3, 'sine');
    setTimeout(() => playSound(659, 0.3, 'sine'), 150);
    setTimeout(() => playSound(784, 0.3, 'sine'), 300);
    
    if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50, 30, 100]);
    }
}

function failOperation(reason) {
    game.isRunning = false;
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

let lastTime = performance.now();

function gameLoop() {
    // Если игра не запущена — выходим немедленно
    if (!game.isRunning || !game.currentOperation) return;
    
    const currentTime = performance.now();
    // Рассчитываем deltaTime (норма ~1)
    const deltaTime = Math.min((currentTime - lastTime) / 16.67, 5); 
    lastTime = currentTime;
    
    // Таймер операции
    game.timer -= deltaTime / 60;
    if (game.timer <= 0) {
        failOperation('Время истекло');
        return;
    }
    updateTimerDisplay();
    
    updateVitals(deltaTime);
    updateVitalsDisplay();
    
    // Анимация сердца
    if (game.organs.heart) {
        game.organs.heart.userData.pulsePhase = (game.organs.heart.userData.pulsePhase || 0) + 0.08 * deltaTime;
        const scale = 1 + Math.sin(game.organs.heart.userData.pulsePhase) * 0.05;
        game.organs.heart.scale.set(scale, scale * 1.2, scale * 0.9);
    }
    
    updateParticles(deltaTime);
    
    // Прогресс инструментов
    if (game.isPerformingAction) {
        const task = game.tasks[game.currentTaskIndex];
        if (task) {
            game.actionProgress += (1 / (task.actionTime * 60)) * deltaTime;
            
            if (game.actionProgress >= 1) {
                game.actionProgress = 1;
                completeTask();
                game.isPerformingAction = false;
            }
            
            const progressBar = document.getElementById('taskProgress');
            if (progressBar) progressBar.style.width = (game.actionProgress * 100) + '%';
        }
    }
    
    game.renderer.render(game.scene, game.camera);
    requestAnimationFrame(gameLoop);
}

function playSound(frequency, duration, type = 'sine') {
    try {
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
        gainNode.gain.exponentialRampToValueAtTime(0.01, game.audioContext.currentTime + duration);
        oscillator.stop(game.audioContext.currentTime + duration);
    } catch (e) {
        console.log('Audio not available');
    }
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

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleInteractionStart(touch.clientX, touch.clientY);
}, { passive: false });

document.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleInteractionEnd();
}, { passive: false });

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
    // Clean up
    Object.keys(game.organs).forEach(key => {
        if (key !== 'body') {
            const organ = game.organs[key];
            if (organ && organ.geometry) {
                game.scene.remove(organ);
                organ.geometry.dispose();
                organ.material.dispose();
                delete game.organs[key];
            }
        }
    });
    
    game.particles.forEach(particle => {
        game.scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
    });
    game.particles = [];
    
    game.currentOperation = null;
    game.currentOperationType = null;
    game.currentTaskIndex = 0;
    game.tasks = [];
    game.isPerformingAction = false;
    game.actionProgress = 0;
    
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    
    renderMenuScene();
});

// Initialize
window.addEventListener('load', () => {
    // Ensure result screen is hidden initially
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    
    initThreeJS();
    
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 1000);
});
