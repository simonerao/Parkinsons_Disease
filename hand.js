// hand.js
import * as THREE from 'three'; // Resolved by import map
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Resolved by import map
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Resolved by import map

document.addEventListener('DOMContentLoaded', () => {
    const handContainer = document.getElementById('hand-container');
    const handTooltip = document.getElementById('hand-tooltip');
    const loadingOverlay = document.getElementById('loading-overlay'); // Get loading overlay

    if (!handContainer) {
        console.error("Hand container not found.");
        if (loadingOverlay) loadingOverlay.style.display = 'none'; // Hide loader if container fails
        return;
    }
    if (!loadingOverlay) {
        console.warn("Loading overlay not found.Proceeding without it.");
    }


    // Ensure the container has a defined size in CSS (e.g., width: 100%; height: 500px;)
    // Otherwise, clientWidth/clientHeight might be 0.
    const width = handContainer.clientWidth;
    const height = handContainer.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000); // FOV, Aspect, Near, Far planes
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true for transparent background
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio); // For sharper rendering on high DPI screens
    handContainer.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly increased ambient light
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Slightly increased directional
    directionalLight.position.set(2, 3, 2).normalize();
    scene.add(directionalLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5); // Sky, Ground, Intensity
    scene.add(hemisphereLight);


    // 3. OrbitControls for user interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 
    controls.dampingFactor = 0.03; // Adjusted for a bit more responsiveness with auto-rotate
    controls.screenSpacePanning = false;
    controls.minDistance = 1; // Prevent zooming too close (adjust as needed)
    controls.maxDistance = 5000; // Prevent zooming too far (adjust based on model scale)
    controls.maxPolarAngle = Math.PI / 1.5; // Allow slightly more vertical rotation if desired
    controls.rotateSpeed = 0.5; 
    controls.zoomSpeed = 0.8;

    // --- AUTO ROTATION ---
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5; // Adjust speed (e.g., 0.5 for slower, 2.0 for faster)
                                   // Negative value will rotate in the opposite direction.
                                   // Rotation stops when user interacts.

    // 4. Load 3D Hand Model
    const loader = new GLTFLoader();
    let handModel;
    const originalColors = new Map();

    // Show loading screen before starting to load
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '1'; // Ensure it's visible if already 'flex'
        loadingOverlay.style.display = 'flex';
    }

    loader.load(
        './models/hand.glb', // Ensure this path is correct
        (gltf) => {
            handModel = gltf.scene;
            scene.add(handModel);

            // Adjust Model Scale (trial-and-error based on your model)
            handModel.scale.set(1000, 1000, 1000); // Keep existing scale or adjust

            // Center the camera and controls target on the scaled model
            const box = new THREE.Box3().setFromObject(handModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            controls.target.copy(center);

            // --- ADJUSTED CAMERA POSITION FOR INITIAL ZOOM ---
            // The multiplier determines how "far back" the camera is.
            // Smaller multiplier = more zoomed in.
            // Adjust this value (e.g., 0.8, 1.0, 1.2) to get the desired initial zoom.
            const boundingSphere = box.getBoundingSphere(new THREE.Sphere());
            const modelRadius = boundingSphere.radius;
            
            // Position camera based on model's bounding sphere radius
            camera.position.x = center.x;
            camera.position.y = center.y + modelRadius * 0.5; // Slightly above center for a better view
            camera.position.z = center.z + modelRadius * 1.5; // Start closer (adjust multiplier)

            // Alternative using size.length():
            // camera.position.x = center.x;
            // camera.position.y = center.y;
            // camera.position.z = center.z + size.length() * 1.2; // Adjusted for closer zoom

            camera.lookAt(center); // Ensure camera is looking at the center

            // Store original colors
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

            // Hide loading screen
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => { // Wait for transition to finish before setting display none
                    loadingOverlay.style.display = 'none';
                }, 500); // Should match transition duration in CSS
            }
        },
        (xhr) => {
            // Optional: Update loading progress (e.g., display xhr.loaded / xhr.total * 100)
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
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
            // Hide loading screen and show error
            if (loadingOverlay) {
                loadingOverlay.innerHTML = `<p style="color: red;">Error loading model. Please try again later.</p>`;
                // Keep the overlay visible to show the error, or hide after a delay:
                // setTimeout(() => { loadingOverlay.style.display = 'none'; }, 3000);
            }
        }
    );

    // 5. Raycasting for hover effects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let intersectedObject = null;
    const highlightColor = new THREE.Color(0xffa500); // Orange highlight

    const parkinsonsAffectedAreas = {
        // Make sure these names match your model's mesh names
        "Thumb": "Parkinson's can cause tremors and rigidity in the thumb, affecting fine motor skills like pinching and grasping.",
        "IndexFinger": "The index finger may experience bradykinesia (slowness of movement) and difficulty with precision tasks.",
        "MiddleFinger": "Rigidity and tremors can reduce the flexibility and control of the middle finger.",
        "RingFinger": "Reduced dexterity and increased stiffness are common in the ring finger.",
        "PinkyFinger": "The little finger can also be affected by tremors and difficulty with coordinated movements.",
        "Palm": "Overall hand dexterity and strength, rooted in the palm, can diminish due to Parkinson's.",
        "Wrist": "Wrist rigidity makes movements stiff and difficult, impacting writing and other daily activities."
    };

    function onMouseMove(event) {
        if (!handModel) return;

        const rect = handContainer.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(handModel, true); // Intersect with the model and its children

        let newIntersectedPart = null;
        if (intersects.length > 0) {
            // Find the first ancestor that has a name in parkinsonsAffectedAreas
            // This helps if the model is complex and ray hits a sub-mesh
            let currentObject = intersects[0].object;
            while (currentObject) {
                if (parkinsonsAffectedAreas[currentObject.name]) {
                    newIntersectedPart = currentObject;
                    break;
                }
                if (currentObject.parent === handModel || !currentObject.parent) break; // Stop if we reach the model root or scene
                currentObject = currentObject.parent;
            }
        }

        if (intersectedObject !== newIntersectedPart) {
            // Restore previous
            if (intersectedObject) {
                setObjectColor(intersectedObject, originalColors.get(intersectedObject.uuid) || (Array.isArray(intersectedObject.material) ? intersectedObject.material.map((mat,i) => originalColors.get(`${intersectedObject.uuid}-${i}`)) : null));
            }

            intersectedObject = newIntersectedPart;

            if (intersectedObject) {
                setObjectColor(intersectedObject, highlightColor);
                displayTooltip(intersectedObject.name, event.clientX, event.clientY);
                controls.autoRotate = false; // Stop auto-rotation on hover
            } else {
                hideTooltip();
                if (!controls.autoRotate && !isUserInteracting()) { // Resume auto-rotation if not interacting
                    controls.autoRotate = true;
                }
            }
        } else if (intersectedObject) {
            updateTooltipPosition(event.clientX, event.clientY);
            controls.autoRotate = false; // Keep auto-rotation stopped while hovering
        }
    }
    
    function setObjectColor(object, color) {
        if (!object || !object.material) return;

        if (Array.isArray(object.material)) {
            object.material.forEach((mat, index) => {
                if (color && Array.isArray(color) && color[index]) { // For restoring original array of colors
                    mat.color.copy(color[index]);
                } else if (color instanceof THREE.Color) { // For applying highlight
                     mat.color.copy(color);
                }
            });
        } else {
            if (color instanceof THREE.Color) {
                 object.material.color.copy(color);
            }
        }
    }


    // Helper to track if user is actively interacting (mousedown)
    let userDragging = false;
    renderer.domElement.addEventListener('mousedown', () => {
        userDragging = true;
        controls.autoRotate = false; // Stop auto-rotation on mousedown
    });
    renderer.domElement.addEventListener('mouseup', () => {
        userDragging = false;
        // Resume auto-rotation if no part is hovered and not dragging
        if (!intersectedObject) {
             controls.autoRotate = true;
        }
    });
    
    function isUserInteracting() {
        // OrbitControls sets a flag or you can check mouse state
        // For simplicity, we use our 'userDragging' flag.
        // A more robust way might involve checking controls' internal state if available,
        // or listening to 'start' and 'end' events from OrbitControls.
        return userDragging;
    }
    
    controls.addEventListener('start', () => {
        controls.autoRotate = false; // Stop auto-rotation when user starts interaction
    });

    controls.addEventListener('end', () => {
        // Only resume auto-rotate if not currently hovering over a highlighted part
        if (!intersectedObject) {
            controls.autoRotate = true;
        }
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
        const tooltipHeight = handTooltip.offsetHeight;
        const containerRect = handContainer.getBoundingClientRect();

        let left = clientX - containerRect.left + 15;
        let top = clientY - containerRect.top + 15;

        if (left + tooltipWidth > containerRect.width - 10) {
            left = containerRect.width - tooltipWidth - 10;
        }
        if (top + tooltipHeight > containerRect.height - 10) {
            top = containerRect.height - tooltipHeight - 10;
        }
        if (left < 10) left = 10;
        if (top < 10) top = 10;


        handTooltip.style.left = `${left}px`;
        handTooltip.style.top = `${top}px`;
    }

    function hideTooltip() {
        if (!handTooltip) return;
        handTooltip.style.visibility = 'hidden';
    }

    handContainer.addEventListener('mousemove', onMouseMove);
    handContainer.addEventListener('mouseleave', () => { // When mouse leaves the container
        if (intersectedObject) {
             setObjectColor(intersectedObject, originalColors.get(intersectedObject.uuid) || (Array.isArray(intersectedObject.material) ? intersectedObject.material.map((mat,i) => originalColors.get(`${intersectedObject.uuid}-${i}`)) : null));
            intersectedObject = null;
            hideTooltip();
        }
        if (!isUserInteracting()) { // Resume auto-rotation if mouse leaves and not interacting
             controls.autoRotate = true;
        }
    });

    // 6. Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // Crucial for damping and auto-rotation
        renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        const newWidth = handContainer.clientWidth;
        const newHeight = handContainer.clientHeight;

        if (newWidth > 0 && newHeight > 0) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
        }
    });
});
