/* eslint no-undef: "off", no-unused-vars: "off" */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js";
import { Rhino3dmLoader } from "https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/loaders/3DMLoader.js";
import rhino3dm from "https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js";
//import Stats from './jsm/libs/stats.module.js';
//import { GUI } from './jsm/libs/lil-gui.module.min.js';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// set up loader for converting the results to threejs
const loader = new Rhino3dmLoader();
loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/");

///////////////////////////////////////////////////////////////////////////////////////////////////
const data = {
  definition: 'perlin_maze.gh',
  inputs: getInputs()
}

let rhino, doc;
rhino3dm().then(async (m) => {
  console.log("Loaded rhino3dm.");
  rhino = m; // global
  init();
  compute();
});

//let previousShadowMap = false;
//downloadButton
const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Gets <input> elements from html and sets handlers
 * (html is generated from the grasshopper definition)
 */
 function getInputs() {
  const inputs = {}
  for (const input of document.getElementsByTagName('input')) {
    switch (input.type) {
      case 'number':
        inputs[input.id] = input.valueAsNumber
        input.onchange = onSliderChange
        break
      case 'range':
        inputs[input.id] = input.valueAsNumber
        input.onmouseup = onSliderChange
        input.ontouchend = onSliderChange
        break
      case 'checkbox':
        inputs[input.id] = input.checked
        input.onclick = onSliderChange
        break
      default:
        break
    }
  }
  return inputs
}
//////////////////////////////////////////////////////////////////////////////////////////////////
// more globals
let scene, camera, renderer, controls, length, len; //sunpos ,stats;
 /**
  * Sets up the scene, camera, renderer, lights and controls and starts the animation
  */

 ///////////////////////////////////////////////////////////////////////////////////////////////////////
 //lighting //
  /*const params = {
  shadows: true,
  exposure: 0.68,
  Power: [110000* 4 ],
};
const bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );
				bulbLight = new THREE.PointLight( 0xffee88, 1, 100, 2 );

				bulbMat = new THREE.MeshStandardMaterial( {
					emissive: 0xffffee,
					emissiveIntensity: 1,
					color: 0x000000
				} );
				bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
				bulbLight.position.set( 0, 2, 0 );
				bulbLight.castShadow = true;
				scene.add( bulbLight );
                  */
  
 ////////////////////////////////////////////////////////////////////////////////////////////////////// 

 /////////////////////////////////////////////////////////////////////////////////////////////////////
 // camera path// 
 ///////////////////////////////////////////////////////////////////////////////////////////////
  function init() {
 
    // Rhino models are z-up, so set this as the default
    THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 );

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1, 1, 1)
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
    camera.position.set(1, -1, 1) // like perspective view

    // very light grey for background, like rhino
    scene.background = new THREE.Color('whitesmoke')

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio( window.devicePixelRatio )
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // add some controls to orbit the camera
    controls = new OrbitControls(camera, renderer.domElement)

    // add a directional light
    const directionalLight = new THREE.DirectionalLight( 0xffffff )
    directionalLight.intensity = 2.5
    scene.add( directionalLight )

    const ambientLight = new THREE.AmbientLight()
    scene.add( ambientLight )

    // handle changes in the window size
    window.addEventListener( 'resize', onWindowResize, false )

    animate();
  }
//////////////////////////////////////////////////////////////////////////////////////////////
async function compute() {
  // construct url for GET /solve/definition.gh?name=value(&...)
  const url = new URL('/solve/' + data.definition, window.location.origin)
  Object.keys(data.inputs).forEach(key => url.searchParams.append(key, data.inputs[key]))
  console.log(url.toString())
  
  try {
    const response = await fetch(url)
  
    if(!response.ok) {
      // TODO: check for errors in response json
      throw new Error(response.statusText)
    }

    const responseJson = await response.json()

    collectResults(responseJson)

  } catch(error) {
    console.error(error)
  }
}
console.log(data.inputs)
/**
* Parse response
*/
function collectResults(responseJson) {
  const values = responseJson.values;

  console.log(values);
  // clear doc
  if( doc !== undefined)
  doc.delete()

//console.log(values)
doc = new rhino.File3dm()
console.log(values)
// for each output (RH_OUT:*)...
for ( let i = 0; i < values.length; i ++ ) {
// ...iterate through data tree structure...
for (const path in values[i].InnerTree) {
  const branch = values[i].InnerTree[path]
  // ...and for each branch...
  for( let j = 0; j < branch.length; j ++) {
    // ...load rhino geometry into doc
    const rhinoObject = decodeItem(branch[j])

         //GET VALUES
        if (values[i].ParamName == "RH_OUT:length") {
          //length = JSON.parse(responseJson.values[i].InnerTree['{ 0; }'][0].data)
          length = Math.round(branch[j].data)
         
          console.log(length)
        }

        if (values[i].ParamName == "RH_OUT:len") {
          //length = JSON.parse(responseJson.values[i].InnerTree['{ 0; }'][0].data)
          len = Math.round(branch[j].data)
          console.log(len)
        }  

        if (rhinoObject !== null) {
          doc.objects().add(rhinoObject, null)
        
      }
    }
  }
}

//GET VALUES
document.getElementById('length').innerText = " Shortest Distance  = " + length + " m"
document.getElementById('len').innerText = " Total Distance  = " + len + " m"
//GET VALUES

 

if (doc.objects().count < 1) {
  console.error("No rhino objects to load!");
  showSpinner(false);
  return;
}

// load rhino doc into three.js scene
const buffer = new Uint8Array(doc.toByteArray()).buffer;
loader.parse(buffer, function (object) {
  // clear objects from scene
  scene.traverse((child) => {
    if (
      child.userData.hasOwnProperty("objectType") &&
      child.userData.objectType === "File3dm"
    ) {
      scene.remove(child);
    }
  });

  ///////////////////////////////////////////////////////////////////////
  // materials //
  // brep
   object.traverse((child) => {
    if (child.isBrep) {
        const mat = new THREE.MeshToonMaterial( {color:rgb(12, 95, 95),roughness: 0.01 ,transparent: true, opacity: 0.80 } )
        child.material = mat;
              
    }
  });
  // sunp
  /* object.traverse((child) => {
    if (child.isSunp) {
        const mat = new THREE.MeshToonMaterial( {color:rgb(194, 205, 35),roughness: 0.01 ,transparent: true, opacity: 0.80 } )
        child.material = mat;
              
    }
  });*/
  //  crvs
  object.traverse((child) => {
    if (child.isLine) {
      if (child.userData.attributes.geometry.userStringCount > 0) {
        //console.log(child.userData.attributes.geometry.userStrings[0][1])
        const col = child.userData.attributes.geometry.userStrings[0][1];
        const threeColor = new THREE.Color("rgb(" + col + ")");
        const mat = new THREE.LineBasicMaterial({ color: threeColor });
        child.material = mat;
      }
    }
  }); 

  ///////////////////////////////////////////////////////////////////////
  // add object graph from rhino model to three.js scene
  scene.add(object);

// hide spinner and enable download button
showSpinner(false)
downloadButton.disabled = false
// zoom to extents
  zoomCameraToSelection(camera, controls, scene.children)
});
}

/**
* Attempt to decode data tree item to rhino geometry
*/
function decodeItem(item) {
const data = JSON.parse(item.data);
if (item.type === "System.String") {
  // hack for draco meshes
  try {
    return rhino.DracoCompression.decompressBase64String(data);
  } catch {} // ignore errors (maybe the string was just a string...)
} else if (typeof data === "object") {
  return rhino.CommonObject.decode(data);
}
return null
}

/**
* Called when a slider value changes in the UI. Collect all of the
* slider values and call compute to solve for a new scene
*/
function onSliderChange () {
  showSpinner(true)
  // get slider values
  let inputs = {}
  for (const input of document.getElementsByTagName('input')) {
    switch (input.type) {
    case 'number':
      inputs[input.id] = input.valueAsNumber
      break
    case 'range':
      inputs[input.id] = input.valueAsNumber
      break
    case 'checkbox':
      inputs[input.id] = input.checked
      break
    }
  }
  
  data.inputs = inputs

  compute()
}
///////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * The animation loop!
 */
 function animate() {
  scene.traverse(function(child){
    if (child.isMesh){
      child.rotation.y +=0.0002
      child.rotation.z +=0.0002
      child.rotation.x +=0.0002
    }
    //else{(child.ispoint)
      //child.rotation.y +=0.0008
      //child.rotation.z +=0.0008
      //child.rotation.x +=0.0008      }
    else{(child.isLine)
      child.rotation.y +=0.0002
      child.rotation.z +=0.0002
      child.rotation.x +=0.0002
    }})
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

/**
* Shows or hides the loading spinner
*/
 function onWindowResize() {
 camera.aspect = window.innerWidth / window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth, window.innerHeight);
 animate();
 }
 
 /**
  * Helper function that behaves like rhino's "zoom to selection", but for three.js!
  */
  function zoomCameraToSelection( camera, controls, selection, fitOffset = 1.2 ) {
   
   const box = new THREE.Box3();
   
   for( const object of selection ) {
     if (object.isLight) continue
     box.expandByObject( object );
   }
   
   const size = box.getSize( new THREE.Vector3() );
   const center = box.getCenter( new THREE.Vector3() );
   
   const maxSize = Math.max( size.x, size.y, size.z );
   const fitHeightDistance = maxSize / ( 2 * Math.atan( Math.PI * camera.fov / 360 ) );
   const fitWidthDistance = fitHeightDistance / camera.aspect;
   const distance = fitOffset * Math.max( fitHeightDistance, fitWidthDistance );
   
   const direction = controls.target.clone()
     .sub( camera.position )
     .normalize()
     .multiplyScalar( distance );
   controls.maxDistance = distance * 10;
   controls.target.copy( center );
   
   camera.near = distance / 100;
   camera.far = distance * 100;
   camera.updateProjectionMatrix();
   camera.position.copy( controls.target ).sub(direction);
   
   controls.update();
    }
 
 /**
  * This function is called when the download button is clicked
  */
 function download () {
     // write rhino doc to "blob"
     const bytes = doc.toByteArray()
     const blob = new Blob([bytes], {type: "application/octect-stream"})
 
     // use "hidden link" trick to get the browser to download the blob
     const filename = data.definition.replace(/\.gh$/, '') + '.3dm'
     const link = document.createElement('a')
     link.href = window.URL.createObjectURL(blob)
     link.download = filename
     link.click()
 }
 function showSpinner(enable) {
  if (enable)
    document.getElementById('loader').style.display = 'block'
  else
    document.getElementById('loader').style.display = 'none'
}