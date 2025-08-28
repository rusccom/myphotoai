// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "ScenariaiOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "ScenariaiOS",
            targets: ["ScenariaiOS"]
        ),
    ],
    dependencies: [
        // Core dependencies
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.8.0"),
        .package(url: "https://github.com/onevcat/Kingfisher.git", from: "7.9.0"),
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.2"),
        
        // UI dependencies
        .package(url: "https://github.com/siteline/SwiftUI-Introspect.git", from: "0.8.0"),
        
        // Utility dependencies
        .package(url: "https://github.com/SwiftyJSON/SwiftyJSON.git", from: "5.0.0"),
    ],
    targets: [
        .target(
            name: "ScenariaiOS",
            dependencies: [
                "Alamofire",
                "Kingfisher",
                "KeychainAccess",
                .product(name: "SwiftUIIntrospect", package: "SwiftUI-Introspect"),
                "SwiftyJSON"
            ],
            path: "Source"
        ),
        .testTarget(
            name: "ScenariaiOSTests",
            dependencies: ["ScenariaiOS"],
            path: "Tests"
        ),
    ]
)
