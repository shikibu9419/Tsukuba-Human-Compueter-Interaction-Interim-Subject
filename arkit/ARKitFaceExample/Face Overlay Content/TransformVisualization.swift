/*
See LICENSE folder for this sample’s licensing information.

Abstract:
Displays coordinate axes visualizing the tracked face pose (and eyes in iOS 12).
*/

import ARKit
import SceneKit

class TransformVisualization: NSObject, VirtualContentController {
    
    var contentNode: SCNNode?
    var camera: ARCamera?
    
    // Load multiple copies of the axis origin visualization for the transforms this class visualizes.
//    lazy var cameraNode = SCNReferenceNode(named: "coordinateOrigin")
    lazy var rightEyeNode = SCNReferenceNode(named: "coordinateOrigin")
    lazy var leftEyeNode = SCNReferenceNode(named: "coordinateOrigin")
    var ip: String = "192.168.10.12"
    var port: UInt16 = 1239
    lazy var client = UDPClient(ip: ip, port: port)
    
    /// - Tag: ARNodeTracking
    func renderer(_ renderer: SCNSceneRenderer, nodeFor anchor: ARAnchor) -> SCNNode? {
        // This class adds AR content only for face anchors.
        guard anchor is ARFaceAnchor else { return nil }
        
        // Load an asset from the app bundle to provide visual content for the anchor.
        contentNode = SCNReferenceNode(named: "coordinateOrigin")
        
        // Add content for eye tracking in iOS 12.
        self.addEyeTransformNodes()
        
        // Provide the node to ARKit for keeping in sync with the face anchor.
        return contentNode
    }

    func renderer(_ renderer: SCNSceneRenderer, didUpdate node: SCNNode, for anchor: ARAnchor) {
        guard #available(iOS 12.0, *), let faceAnchor = anchor as? ARFaceAnchor
            else { return }
        
        rightEyeNode.simdTransform = faceAnchor.rightEyeTransform
        leftEyeNode.simdTransform = faceAnchor.leftEyeTransform

        debugPrint(renderer.pointOfView?.position, renderer.pointOfView?.worldPosition)
//        debugPrint(self.camera, self.camera?.transform)
//        let leftEyePosition = SCNVector3(faceAnchor.leftEyeTransform.columns.3.x, faceAnchor.leftEyeTransform.columns.3.y, faceAnchor.leftEyeTransform.columns.3.z)
//        let rightEyePosition = SCNVector3(faceAnchor.rightEyeTransform.columns.3.x, faceAnchor.rightEyeTransform.columns.3.y, faceAnchor.rightEyeTransform.columns.3.z)
//        print(leftEyePosition, rightEyePosition)
//        print("\nInter-eye distance in centimeters: ", distance(float3(leftEyePosition), float3(rightEyePosition)) * 100)
//
//        let leftEyeDistanceFromCamera = distance(float3(leftEyeNode.worldPosition), float3(SCNVector3Zero.x))
//        let rightEyeDistanceFromCamera = distance(float3(rightEyeNode.worldPosition.x), float3(SCNVector3Zero.x))

        //5. Calculate The Average Distance Of The Eyes To The Camera
//        let averageDistance = (leftEyeDistanceFromCamera + rightEyeDistanceFromCamera) / 2
//        let averageDistanceCM = averageDistance * 100
//        print("Approximate Distance Of Face From Camera = \(averageDistanceCM)")
//        let vec = (leftEyeNode.worldPosition.x, leftEyeNode.worldPosition.y, leftEyeNode.worldPosition.z)
    
//        debugPrint(self.camera?.eulerAngles, leftEyeNode.worldPosition)
//        debugPrint("left:", leftEyeNode.worldPosition, simd_distance(simd_float3(leftEyeNode.worldPosition), simd_float3(SCNVector3Zero)))
//        debugPrint("right:", rightEyeNode.worldPosition, simd_distance(simd_float3(rightEyeNode.worldPosition), simd_float3(SCNVector3Zero)))

        let timestamp = Date().millisecondsSince1970
//        debugPrint("\(faceAnchor.transform),\(faceAnchor.leftEyeTransform),\(leftEyeDistanceFromCamera),\(faceAnchor.rightEyeTransform),\(rightEyeDistanceFromCamera)")
//        client.send(text: "\(faceAnchor.transform),\(faceAnchor.leftEyeTransform),\(leftEyeDistanceFromCamera),\(faceAnchor.rightEyeTransform),\(rightEyeDistanceFromCamera)")
        client.send(text: "\(timestamp),\(self.camera?.transform),\(faceAnchor.transform),\(faceAnchor.leftEyeTransform),\(faceAnchor.rightEyeTransform),\(self.camera?.eulerAngles)")

//        debugPrint("transforms:", faceAnchor.rightEyeTransform, faceAnchor.leftEyeTransform)
//        debugPrint("distance:", measureDistance(startPosition: faceAnchor.rightEyeTransform[3], endPosition: faceAnchor.leftEyeTransform[3]))
    }
    
    func addEyeTransformNodes() {
        guard #available(iOS 12.0, *), let anchorNode = contentNode else { return }
        
        // Scale down the coordinate axis visualizations for eyes.
        rightEyeNode.simdPivot = float4x4(diagonal: [3, 3, 3, 1])
        leftEyeNode.simdPivot = float4x4(diagonal: [3, 3, 3, 1])
        
        anchorNode.addChildNode(rightEyeNode)
        anchorNode.addChildNode(leftEyeNode)
    }
}

import Network


class UDPClient {
    let connection: NWConnection

    /// 送受信したメッセージ
//    var messages = BehaviorRelay<[Message]>(value: [])
    let queue = DispatchQueue(label: "message")

    init(ip: String, port: UInt16) {
        let host = NWEndpoint.Host(ip)
        let port = NWEndpoint.Port(integerLiteral: port)

        /// NWConnection にホスト名とポート番号を指定して初期化
        self.connection = NWConnection(host: host, port: port, using: .udp)
        
        /// コネクションのステータス監視のハンドラを設定
        self.connection.stateUpdateHandler = { (newState) in
            switch newState {
            case .ready:
                NSLog("Ready to send")
            case .waiting(let error):
                NSLog("\(#function), \(error)")
            case .failed(let error):
                NSLog("\(#function), \(error)")
            case .setup: break
            case .cancelled: break
            case .preparing: break
            }
        }
        
        /// コネクションの開始
        self.connection.start(queue: queue)
        self.receive(on: connection)
    }

    func receive(on connection: NWConnection) {
        /// コネクションからデータを受信
        connection.receive(minimumIncompleteLength: 0, maximumLength: Int(UInt32.max)) { [weak self] (data, _, _, error) in
            if let data = data {
                let text = String(data: data, encoding: .utf8)!
                print(text)
//                let message = Message(text: text, isReceived: true)
//                self?.messages.acceptAppending(message)
//                self?.receive(on: connection)
            } else {
                NSLog("\(#function), Received data is nil")
            }
        }
    }
    
    func send(text: String) {
        let message = "\(text)\n"
        let data = message.data(using: .utf8)!
        print(message)

        /// メッセージの送信
        connection.send(content: data, completion: .contentProcessed { [unowned self] (error) in
            if let error = error {
                NSLog("\(#function), \(error)")
            } else {
                print(text)
//                let message = Message(text: text, isReceived: false)
//                self.messages.acceptAppending(message)
            }
        })
    }
}

extension Date {
    var millisecondsSince1970: Int64 {
        Int64((self.timeIntervalSince1970 * 1000.0).rounded())
    }
    
    init(milliseconds: Int64) {
        self = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000)
    }
}
