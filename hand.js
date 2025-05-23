import * as THREE from 'three'; // Resolved by import map
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Resolved by import map
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Resolved by import map

document.addEventListener('DOMContentLoaded', () => {
    const handContainer = document.getElementById('hand-container');
    const handTooltip = document.getElementById('hand-tooltip');

    if (!handContainer) {
        console.error("Hand container not found.");
        return;
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
    handContainer.appendChild(renderer.domElement);

    // Initial camera position (will be adjusted after model load)
    // camera.position.set(0, 0, 5); // This line is less critical now due to post-load adjustment

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light, 0.5 intensity
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Brighter light from a specific direction
    directionalLight.position.set(1, 1, 1).normalize(); // Position it top-right-front
    scene.add(directionalLight);

    // 3. OrbitControls for user interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // IMPORTANT: Enables smooth deceleration
    controls.dampingFactor = 0.02; // ADJUSTED: Smaller number = more glide/less friction
    controls.screenSpacePanning = false; // Prevents panning in screen space (good for orbiting)
    controls.maxPolarAngle = Math.PI / 2; // Limits vertical rotation to prevent flipping upside down
    controls.rotateSpeed = 1; // ADJUSTED: Slower rotation speed, experiment with 0.2, 0.8 etc.
    controls.zoomSpeed = 0.8; // Optional: Adjust zoom speed if desired

    // 4. Load 3D Hand Model
    const loader = new GLTFLoader();
    let handModel;
    const originalColors = new Map(); // To store original colors for hover effect

    loader.load('./models/hand.glb', (gltf) => {
        handModel = gltf.scene;
        scene.add(handModel);

        // --- UPDATES FOR SCALE AND CAMERA POSITIONING ---

        // 1. Adjust Model Scale:
        // Increase this value significantly if the hand is still too small.
        // Try 500, 1000, 2000, etc., depending on your model's native size.
        // It's often a trial-and-error process.
        handModel.scale.set(1000, 1000, 1000); // Example: Scaled up 500 times

        // 2. Center the camera and controls target on the scaled model:
        // This ensures the camera is positioned well and orbiting happens around the model.
        const box = new THREE.Box3().setFromObject(handModel);
        const center = box.getCenter(new THREE.Vector3()); // Get the center of the model's bounding box
        const size = box.getSize(new THREE.Vector3());   // Get the dimensions of the model's bounding box

        // Set the target for OrbitControls to the center of the model
        controls.target.copy(center);

        // Position the camera
        // A common strategy is to move the camera back from the center by a factor of the model's largest dimension.
        // `size.length()` calculates the diagonal of the bounding box.
        // The `1.5` (or `2.0`, `3.0` etc.) multiplier here ensures the camera is far enough back to see the whole model.
        camera.position.x = center.x;
        camera.position.y = center.y;
        camera.position.z = center.z + size.length() * 2.5; // Adjusted based on model size

        // --- END UPDATES ---

        // Store original colors for all meshes in the model for hover effect
        handModel.traverse((object) => {
            if (object.isMesh) {
                // Ensure material exists and is not an array of materials (which can happen with GLTF)
                if (object.material) {
                    // Handle both single material and array of materials
                    if (Array.isArray(object.material)) {
                        object.material.forEach((mat, index) => {
                            // Store color by object name and material index for uniqueness
                            originalColors.set(`${object.name}-${index}`, mat.color.getHex());
                        });
                    } else {
                        // Store color by object name for single material
                        originalColors.set(object.name, object.material.color.getHex());
                    }
                }
            }
        });

        controls.update(); // Important: Update controls after changing target/position

    }, undefined, (error) => {
        console.error('An error occurred while loading the 3D model:', error);
    });

    // 5. Raycasting for hover effects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let intersectedObject = null;
    const highlightColor = new THREE.Color(0xffa500); // Orange highlight

    // Define affected parts and their explanations
    // *** IMPORTANT: These names must match the names of the mesh objects in your 3D model! ***
    const parkinsonsAffectedAreas = {
        "Thumb": "Parkinson's can cause tremors and rigidity in the thumb, affecting fine motor skills like pinching and grasping.",
        "IndexFinger": "The index finger may experience bradykinesia (slowness of movement) and difficulty with precision tasks.",
        "MiddleFinger": "Rigidity and tremors can reduce the flexibility and control of the middle finger.",
        "RingFinger": "Reduced dexterity and increased stiffness are common in the ring finger.",
        "PinkyFinger": "The little finger can also be affected by tremors and difficulty with coordinated movements.",
        "Palm": "Overall hand dexterity and strength, rooted in the palm, can diminish due to Parkinson's.",
        "Wrist": "Wrist rigidity makes movements stiff and difficult, impacting writing and other daily activities."
        // Add more parts as needed, matching their names in your 3D model
    };

    function onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        // Relative to the handContainer element
        const rect = handContainer.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;


        if (!handModel) return; // Wait until model is loaded

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(handModel.children, true); // true to check all descendants

        if (intersects.length > 0) {
            const newIntersectedObject = intersects[0].object;

            // Only update if a new object is intersected
            if (intersectedObject !== newIntersectedObject) {
                // Restore previous object's color if it was highlighted
                if (intersectedObject && originalColors.has(intersectedObject.name)) {
                    // Check if it's a multi-material object or single
                    if (Array.isArray(intersectedObject.material)) {
                        intersectedObject.material.forEach((mat, index) => {
                            if (originalColors.has(`${intersectedObject.name}-${index}`)) {
                                mat.color.setHex(originalColors.get(`${intersectedObject.name}-${index}`));
                            }
                        });
                    } else {
                        intersectedObject.material.color.setHex(originalColors.get(intersectedObject.name));
                    }
                }

                // Highlight the new intersected object if it's an affected part
                intersectedObject = newIntersectedObject;
                if (parkinsonsAffectedAreas[intersectedObject.name]) {
                    // Apply highlight color
                    if (Array.isArray(intersectedObject.material)) {
                        intersectedObject.material.forEach(mat => {
                            mat.color.copy(highlightColor);
                        });
                    } else {
                        intersectedObject.material.color.copy(highlightColor);
                    }
                    displayTooltip(intersectedObject.name, event.clientX, event.clientY);
                } else {
                    hideTooltip(); // Hide if new object is not an affected part
                }
            } else if (parkinsonsAffectedAreas[intersectedObject.name]) {
                // If still over the same affected object, just update tooltip position
                updateTooltipPosition(event.clientX, event.clientY);
            }
        } else {
            // No intersection, hide tooltip and restore color if an object was previously highlighted
            if (intersectedObject && originalColors.has(intersectedObject.name)) {
                 if (Array.isArray(intersectedObject.material)) {
                    intersectedObject.material.forEach((mat, index) => {
                        if (originalColors.has(`${intersectedObject.name}-${index}`)) {
                            mat.color.setHex(originalColors.get(`${intersectedObject.name}-${index}`));
                        }
                    });
                } else {
                    intersectedObject.material.color.setHex(originalColors.get(intersectedObject.name));
                }
            }
            intersectedObject = null;
            hideTooltip();
        }
    }

    function displayTooltip(partName, clientX, clientY) {
        handTooltip.style.visibility = 'visible';
        handTooltip.innerHTML = `<strong>${partName}:</strong> ${parkinsonsAffectedAreas[partName]}`;
        updateTooltipPosition(clientX, clientY);
    }

    function updateTooltipPosition(clientX, clientY) {
        // Adjust tooltip position to avoid it going off-screen
        const tooltipWidth = handTooltip.offsetWidth;
        const tooltipHeight = handTooltip.offsetHeight;

        let left = clientX + 15; // Offset from cursor
        let top = clientY + 15;

        // Check if tooltip goes past right edge of window
        if (left + tooltipWidth > window.innerWidth - 20) {
            left = window.innerWidth - tooltipWidth - 20;
        }
        // Check if tooltip goes past bottom edge of window
        if (top + tooltipHeight > window.innerHeight - 20) {
            top = window.innerHeight - tooltipHeight - 20;
        }

        handTooltip.style.left = `${left}px`;
        handTooltip.style.top = `${top}px`;
    }

    function hideTooltip() {
        handTooltip.style.visibility = 'hidden';
    }

    handContainer.addEventListener('mousemove', onMouseMove);

    // 6. Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // Crucial for damping to work smoothly
        renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        // Update container dimensions
        const newWidth = handContainer.clientWidth;
        const newHeight = handContainer.clientHeight;

        // Update camera aspect ratio and projection matrix
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        // Update renderer size
        renderer.setSize(newWidth, newHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
    });
});