import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Wrap the main logic in a function
function initializeHandVisualization() {
    const handContainer = document.getElementById('hand-container');
    const handTooltip = document.getElementById('hand-tooltip');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (!handContainer) {
        console.error("Hand container not found.");
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        return;
    }
    if (!loadingOverlay) {
        console.warn("Loading overlay not found. Proceeding without it.");
    }

    // Critical: Check for valid dimensions. If not, this function might have been called too early.
    if (handContainer.clientWidth === 0 || handContainer.clientHeight === 0) {
        console.warn("Hand container has no dimensions. Initialization might be too early or section not visible.");
        // Optionally, try again after a short delay, or rely on resize event
        // For now, we'll proceed, but OrbitControls and camera might be misconfigured.
        // A more robust solution would be to wait for the container to be visible.
    }


    const width = handContainer.clientWidth || 500; // Fallback width
    const height = handContainer.clientHeight || 450; // Fallback height


    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Clear previous renderer if any (important if re-initializing)
    while (handContainer.firstChild) {
        handContainer.removeChild(handContainer.firstChild);
    }
    handContainer.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(2, 3, 2).normalize();
    scene.add(directionalLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    scene.add(hemisphereLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 5000;
    controls.maxPolarAngle = Math.PI / 1.5;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;

    const loader = new GLTFLoader();
    let handModel;
    const originalColors = new Map();

    if (loadingOverlay) {
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.display = 'flex';
    }

    loader.load(
        './models/hand.glb',
        (gltf) => {
            handModel = gltf.scene;
            scene.add(handModel);
            console.log("Loaded mesh names:");
            handModel.traverse((object) => {
                if (object.isMesh) {
                    console.log(object.name);
                }
            });

            handModel.scale.set(1000, 1000, 1000);

            const box = new THREE.Box3().setFromObject(handModel);
            const center = box.getCenter(new THREE.Vector3());
            const boundingSphere = box.getBoundingSphere(new THREE.Sphere());
            const modelRadius = boundingSphere.radius;

            controls.target.copy(center);
            camera.position.x = center.x;
            camera.position.y = center.y + modelRadius * 0.5;
            camera.position.z = center.z + modelRadius * 1.5;
            camera.lookAt(center);

            handModel.traverse((object) => {
                if (object.isMesh && object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((mat, index) => {
                            originalColors.set(`${object.uuid}-${index}`, mat.color.clone());
                        });
                    } else {
                        originalColors.set(object.uuid, object.material.color.clone());
                    }
                }
            });

            controls.update();

            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 500);
            }
        },
        (xhr) => {
            const percentLoaded = Math.round((xhr.loaded / xhr.total) * 100);
            if (loadingOverlay) {
                const pElement = loadingOverlay.querySelector('p');
                if (pElement) {
                    pElement.textContent = `Loading 3D Model... ${percentLoaded}%`;
                }
            }
        },
        (error) => {
            console.error('An error occurred while loading the 3D model:', error);
            if (loadingOverlay) {
                loadingOverlay.innerHTML = `<p style="color: red;">Error loading model. Please try again later.</p>`;
            }
        }
    );

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let intersectedObject = null;
    const highlightColor = new THREE.Color("rgb(129, 209, 219)");

    const parkinsonsAffectedAreas = {
        "Thumb": "Parkinson's can cause tremors and rigidity in the thumb, affecting fine motor skills like pinching and grasping.",
        "IndexFinger": "The index finger may experience bradykinesia (slowness of movement) and difficulty with precision tasks.",
        "MiddleFinger": "Rigidity and tremors can reduce the flexibility and control of the middle finger.",
        "RingFinger": "Reduced dexterity and increased stiffness are common in the ring finger.",
        "PinkyFinger": "The little finger can also be affected by tremors and difficulty with coordinated movements.",
        "Palm": "Overall hand dexterity and strength, rooted in the palm, can diminish due to Parkinson's.",
        "Wrist": "Wrist rigidity makes movements stiff and difficult, impacting writing and other daily activities."
    };

    function onMouseMove(event) {
        if (!handModel || !handContainer) return;

        const rect = handContainer.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(handModel.children, true);

        let newIntersectedPart = null;
        if (intersects.length > 0) {
            let hitObject = intersects[0].object;
            let currentCheck = hitObject;
            while (currentCheck) {
                if (currentCheck.isMesh && parkinsonsAffectedAreas[currentCheck.name]) {
                    newIntersectedPart = currentCheck;
                    break;
                }
                if (!currentCheck.isMesh && currentCheck.isGroup && parkinsonsAffectedAreas[currentCheck.name]) {
                    newIntersectedPart = currentCheck;
                    break;
                }
                if (currentCheck === handModel || !currentCheck.parent) {
                    break;
                }
                currentCheck = currentCheck.parent;
            }
        }

        if (intersectedObject !== newIntersectedPart) {
            if (intersectedObject) {
                setObjectColor(intersectedObject, originalColors.get(intersectedObject.uuid) || (Array.isArray(intersectedObject.material) ? intersectedObject.material.map((mat, i) => originalColors.get(`${intersectedObject.uuid}-${i}`)) : null));
            }
            intersectedObject = newIntersectedPart;
            if (intersectedObject) {
                setObjectColor(intersectedObject, highlightColor);
                displayTooltip(intersectedObject.name, event.clientX, event.clientY);
                controls.autoRotate = false;
            } else {
                hideTooltip();
                if (!controls.autoRotate && !isUserInteracting()) {
                    controls.autoRotate = true;
                }
            }
        } else if (intersectedObject) {
            updateTooltipPosition(event.clientX, event.clientY);
            controls.autoRotate = false;
        }
    }

    function setObjectColor(object, color) {
        if (!object || !object.material) return;
        if (Array.isArray(object.material)) {
            object.material.forEach((mat) => { // Simplified: apply to all sub-materials
                if (color instanceof THREE.Color) mat.color.copy(color);
            });
        } else {
            if (color instanceof THREE.Color) object.material.color.copy(color);
        }
    }

    let userDragging = false;
    if (renderer.domElement) {
        renderer.domElement.addEventListener('mousedown', () => {
            userDragging = true;
            controls.autoRotate = false;
        });
        renderer.domElement.addEventListener('mouseup', () => {
            userDragging = false;
            if (!intersectedObject) {
                controls.autoRotate = true;
            }
        });
    }

    function isUserInteracting() { return userDragging; }

    controls.addEventListener('start', () => { controls.autoRotate = false; });
    controls.addEventListener('end', () => {
        if (!intersectedObject) { controls.autoRotate = true; }
    });

    function displayTooltip(partName, clientX, clientY) {
        if (!handTooltip) return;
        handTooltip.style.visibility = 'visible';
        handTooltip.innerHTML = `<strong>${partName}:</strong> ${parkinsonsAffectedAreas[partName]}`;
        updateTooltipPosition(clientX, clientY);
    }

    function updateTooltipPosition(clientX, clientY) {
        if (!handTooltip) return;
        const tooltipWidth = handTooltip.offsetWidth;
        // const tooltipHeight = handTooltip.offsetHeight; // Not used in this positioning logic
        // const containerRect = handContainer.getBoundingClientRect(); // Not used for fixed positioning

        let left = clientX + 20; // Adjust offset from cursor
        let top = clientY + 20;  // Adjust offset from cursor

        if (left + tooltipWidth > window.innerWidth - 10) { // Use window.innerWidth for viewport
            left = window.innerWidth - tooltipWidth - 10;
        }
        // Add similar check for bottom edge if needed
        if (top + handTooltip.offsetHeight > window.innerHeight - 10) {
            top = clientY - handTooltip.offsetHeight - 10; // Position above cursor if near bottom
        }

        handTooltip.style.left = `${left}px`;
        handTooltip.style.top = `${top}px`;
    }

    function hideTooltip() {
        if (!handTooltip) return;
        handTooltip.style.visibility = 'hidden';
    }

    if (handContainer) {
        handContainer.addEventListener('mousemove', onMouseMove);
        handContainer.addEventListener('mouseleave', () => {
            if (intersectedObject) {
                setObjectColor(intersectedObject, originalColors.get(intersectedObject.uuid) || (Array.isArray(intersectedObject.material) ? intersectedObject.material.map((mat, i) => originalColors.get(`${intersectedObject.uuid}-${i}`)) : null));
                intersectedObject = null;
                hideTooltip();
            }
            if (!isUserInteracting()) {
                controls.autoRotate = true;
            }
        });
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    const resizeObserver = new ResizeObserver(entries => {
        if (!entries || entries.length === 0) return;
        const { width: newWidth, height: newHeight } = entries[0].contentRect;

        if (newWidth > 0 && newHeight > 0) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
        }
    });
    if (handContainer) resizeObserver.observe(handContainer);

    // Initial resize call in case dimensions are set after a delay
    // setTimeout(() => {
    //     if (handContainer) {
    //         const newWidth = handContainer.clientWidth;
    //         const newHeight = handContainer.clientHeight;
    //         if (newWidth > 0 && newHeight > 0) {
    //             camera.aspect = newWidth / newHeight;
    //             camera.updateProjectionMatrix();
    //             renderer.setSize(newWidth, newHeight);
    //         }
    //     }
    // }, 100);

}

// Make the function globally available for the main script to call
window.initializeHandVisualization = initializeHandVisualization;