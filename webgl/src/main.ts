import "./style.css";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

import desktopModel from "../models/poly.glb?url";

import csvDataUrl from "../data/gaze.csv?url";

const smartPhoneSize = { height: 145 / 1000, width: 70 / 1000 };
const monitorSize = { height: 300 / 1000, width: 520 / 1000 };

const reshape1d = <T>(array: T[], cols: number): T[][] => {
  const ret = [];
  for (let i = 0; i < array.length; i += cols) {
    ret.push(array.slice(i, i + cols));
  }
  return ret;
};

const transpose = <T>(array: T[][]): T[][] => array[0].map((_, i) => array.map((row) => row[i]));

const sleep = (ms: number) => new Promise((s) => setTimeout(s, ms));

const loadCSVData = async (
  scene: BABYLON.Scene,
  cameraPlane: BABYLON.Mesh,
  monitors: BABYLON.Mesh[]
) => {
  const resBody = await fetch("/gaze.csv").then((res) => res.text());
  const data = resBody.split(/\r?\n/).map((row) => row.split(",").map((d) => parseFloat(d)));

  const row = data[1];
  const timestamp = row[0];

  //   const faceTransform = transpose(reshape1d(row.slice(1, 17), 4));
  //   faceTransform[2][3] = -faceTransform[2][3];
  //   console.log(transpose(faceTransform))
  //   row[15] = -row[15];
  const cameraTransform = BABYLON.Matrix.FromArray(row.slice(1, 17));
  const faceTransform = BABYLON.Matrix.FromArray(row.slice(17, 33));
  const leftEyeTransform = BABYLON.Matrix.FromArray(row.slice(33, 49));
  const rightEyeTransform = BABYLON.Matrix.FromArray(row.slice(49, 65));
  const cameraEuler = BABYLON.Matrix.FromArray(row.slice(65, 68));
  //   console.log(faceTransform)
  // const facePosition = faceTransform.m.slice(12, 15);
  //   console.log(facePosition)
  //   console.log(BABYLON.Matrix.FromValues(...row.slice(1, 17)))
  //   console.log(faceTransform, facePosition);
  // debug
  const scale = new BABYLON.Vector3();
  const rotationQuaternion = new BABYLON.Quaternion();
  const translation = new BABYLON.Vector3();
  cameraTransform.decompose(scale, rotationQuaternion, translation);
  console.log(scale, rotationQuaternion, translation);

  const CoT = new BABYLON.TransformNode("root");
  CoT.parent = cameraPlane;
  CoT.scaling = new BABYLON.Vector3(-1, 1, 1); // To flip X axes of face
  const faceSphere = BABYLON.MeshBuilder.CreateSphere("face", { diameter: 0.2 }, scene);
  faceSphere.rotate(new BABYLON.Vector3(0, 0, 0), 0);
  faceSphere.parent = CoT;

  faceTransform.decompose(
    faceSphere.scaling,
    faceSphere.rotationQuaternion || undefined,
    faceSphere.position
  );

  const leftEyeSphere = BABYLON.MeshBuilder.CreateSphere("left-eye", { diameter: 0.02 }, scene);
  leftEyeSphere.rotate(new BABYLON.Vector3(0, 0, 0), 0);
  leftEyeSphere.parent = faceSphere;
  leftEyeTransform.decompose(
    leftEyeSphere.scaling,
    leftEyeSphere.rotationQuaternion || undefined,
    leftEyeSphere.position
  );

  const rightEyeSphere = BABYLON.MeshBuilder.CreateSphere("right-eye", { diameter: 0.02 }, scene);
  rightEyeSphere.rotate(new BABYLON.Vector3(0, 0, 0), 0);
  rightEyeSphere.parent = faceSphere;
  rightEyeTransform.decompose(
    rightEyeSphere.scaling,
    rightEyeSphere.rotationQuaternion || undefined,
    rightEyeSphere.position
  );

  // const faceAxes = new BABYLON.AxesViewer(scene, 1);
  // faceAxes.xAxis.parent = faceSphere;
  // faceAxes.yAxis.parent = faceSphere;
  // faceAxes.zAxis.parent = faceSphere;

  const leftEyeRay = new BABYLON.Ray(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 1));
  const leftEyeRayHelper = new BABYLON.RayHelper(leftEyeRay);
  leftEyeRayHelper.attachToMesh(leftEyeSphere, new BABYLON.Vector3(0, 0, 1));
  leftEyeRayHelper.show(scene);

  const rightEyeRay = new BABYLON.Ray(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 1));
  const rightEyeRayHelper = new BABYLON.RayHelper(rightEyeRay);
  rightEyeRayHelper.attachToMesh(rightEyeSphere, new BABYLON.Vector3(0, 0, 1));
  rightEyeRayHelper.show(scene);

  const gazePoint = BABYLON.MeshBuilder.CreateSphere("gaze-point", { diameter: 0.05 }, scene);
  //   gazePoint.parent = monitors[0];
  const material = new BABYLON.StandardMaterial("red", scene);
  material.alpha = 1;
  material.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.0);
  gazePoint.material = material;

  for (let i = 1; i < data.length - 1; i++) {
    const row = data[i];

    //     const cameraTransform = BABYLON.Matrix.FromArray(row.slice(1, 17));
    //     cameraTransform.decompose(undefined, parent.rotationQuaternion || undefined);
    //     parent.addRotation(0, 0, Math.PI / 2);

    const faceTransform = BABYLON.Matrix.FromArray(row.slice(17, 33));
    const leftEyeTransform = BABYLON.Matrix.FromArray(row.slice(33, 49));
    const rightEyeTransform = BABYLON.Matrix.FromArray(row.slice(49, 65));
    faceTransform.decompose(
      undefined,
      faceSphere.rotationQuaternion || undefined,
      faceSphere.position
    );
    leftEyeTransform.decompose(
      undefined,
      leftEyeSphere.rotationQuaternion || undefined,
      leftEyeSphere.position
    );
    rightEyeTransform.decompose(
      undefined,
      rightEyeSphere.rotationQuaternion || undefined,
      rightEyeSphere.position
    );

    const targets = leftEyeRay.intersectsMeshes(monitors);
    if (targets.length) {
      targets.forEach((target) => {
        gazePoint.position.copyFrom(target.pickedPoint || new BABYLON.Vector3(0, 0, 0));
      });
    }

    await sleep(data[i + 1][0] - row[0]);
  }
};

window.onload = () => {
  const canvas = document.getElementById("render-canvas") as HTMLCanvasElement;

  if (canvas) {
    const engine = new BABYLON.Engine(canvas, true);
    const scene = createScene(canvas, engine);
    const folderName = desktopModel.split("/").slice(0, -1).join("/").concat("/");
    const fileName = desktopModel.split("/").slice(-1)[0];

    BABYLON.SceneLoader.AppendAsync(folderName, fileName, scene)
      .then(() => {
        console.log(scene);
        console.log("model loaded", scene.meshes.slice(-1)[0]);
        var CoT = new BABYLON.TransformNode("root");

        scene.meshes.slice(-1)[0].parent = CoT;
        CoT.rotation.y = Math.PI;
      })
      .catch(console.error);
    scene.useRightHandedSystem = true;

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
      scene.render();
    });
    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
      engine.resize();
    });
  }
};

const createScene = function (canvas: HTMLCanvasElement, engine: BABYLON.Engine) {
  const scene = new BABYLON.Scene(engine);

  // new BABYLON.AxesViewer(scene, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    Math.PI / 3,
    3,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.attachControl(canvas, true);

  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  const monitorPlane = BABYLON.MeshBuilder.CreatePlane(
    "monitor",
    { ...monitorSize, sideOrientation: 1 },
    scene
  );
  monitorPlane.position = new BABYLON.Vector3(
    150 / 1000,
    250 / 1000 + monitorSize.height / 2,
    230 / 1000
  );
  monitorPlane.rotation.y = (10 / 180) * Math.PI;

  const smartPhonePlane = BABYLON.MeshBuilder.CreatePlane(
    "smart-phone",
    { ...smartPhoneSize, sideOrientation: 1 },
    scene
  );
  smartPhonePlane.position = new BABYLON.Vector3(
    230 / 1000,
    60 / 1000 + smartPhoneSize.height / 2,
    10 / 1000
  );
  smartPhonePlane.rotate(new BABYLON.Vector3(0, 0, 0), 0);
  //   smartPhonePlane.rotate(new BABYLON.Vector3(1, 0, 0), (15 / 180) * Math.PI);
  smartPhonePlane.rotate(new BABYLON.Vector3(0, 1, 0), (10 / 180) * Math.PI);
  //   smartPhonePlane.rotate(new BABYLON.Vector3(0, 0, 1), (-5 / 180) * Math.PI);

  const localAxes = new BABYLON.AxesViewer(scene, 0.1);
  localAxes.xAxis.parent = smartPhonePlane;
  localAxes.yAxis.parent = smartPhonePlane;
  localAxes.zAxis.parent = smartPhonePlane;

  loadCSVData(scene, smartPhonePlane, [monitorPlane]);

  return scene;
};
