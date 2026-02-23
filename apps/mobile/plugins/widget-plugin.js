const {
  withDangerousMod,
  withXcodeProject,
  withEntitlementsPlist,
  IOSConfig,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const WIDGET_NAME = "MyFastWidget";
const APP_GROUP = "group.com.myfast.app";
const BUNDLE_ID_SUFFIX = ".widget";
const DEPLOYMENT_TARGET = "17.0";

/**
 * Expo config plugin that adds the WidgetKit extension to the iOS project.
 *
 * 1. Copies Swift source files into the widget target directory
 * 2. Adds the widget extension target to the Xcode project
 * 3. Configures App Group entitlement on both main app and widget
 */
const withWidget = (config) => {
  // Step 1: Add App Group entitlement to the main app
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults["com.apple.security.application-groups"] = [APP_GROUP];
    return mod;
  });

  // Step 2: Copy Swift files into ios/<WidgetName>/ directory
  config = withDangerousMod(config, [
    "ios",
    (mod) => {
      const iosDir = path.join(mod.modRequest.platformProjectRoot);
      const widgetDir = path.join(iosDir, WIDGET_NAME);

      // Create widget directory
      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }

      // Source Swift files from the widgets/ios/ directory
      const sourceDir = path.join(
        mod.modRequest.projectRoot,
        "widgets",
        "ios"
      );

      const swiftFiles = [
        "FastState.swift",
        "MyFastWidget.swift",
        "MyFastWidgetEntryView.swift",
        "MyFastWidgetBundle.swift",
      ];

      for (const file of swiftFiles) {
        const src = path.join(sourceDir, file);
        const dest = path.join(widgetDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      // Copy entitlements file
      const entSrc = path.join(sourceDir, "MyFastWidget.entitlements");
      const entDest = path.join(widgetDir, "MyFastWidget.entitlements");
      if (fs.existsSync(entSrc)) {
        fs.copyFileSync(entSrc, entDest);
      }

      // Create Info.plist for widget extension
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>MyFast Widget</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>`;

      fs.writeFileSync(path.join(widgetDir, "Info.plist"), infoPlist);

      return mod;
    },
  ]);

  // Step 3: Add the widget target to the Xcode project
  config = withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const mainBundleId =
      mod.ios?.bundleIdentifier ?? "com.myfast.app";
    const widgetBundleId = mainBundleId + BUNDLE_ID_SUFFIX;

    // Check if widget target already exists
    const existingTarget = proj.pbxTargetByName(WIDGET_NAME);
    if (existingTarget) {
      return mod;
    }

    // Add the widget extension target
    const target = proj.addTarget(
      WIDGET_NAME,
      "app_extension",
      WIDGET_NAME,
      widgetBundleId
    );

    // Add source files to the widget target
    const widgetGroupKey = proj.pbxCreateGroup(WIDGET_NAME, WIDGET_NAME);

    // Find the main group and add widget group to it
    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
    proj.addToPbxGroup(widgetGroupKey, mainGroupId);

    const swiftFiles = [
      "FastState.swift",
      "MyFastWidget.swift",
      "MyFastWidgetEntryView.swift",
      "MyFastWidgetBundle.swift",
    ];

    for (const file of swiftFiles) {
      proj.addSourceFile(
        `${WIDGET_NAME}/${file}`,
        { target: target.uuid },
        widgetGroupKey
      );
    }

    // Add Info.plist as a resource
    proj.addResourceFile(
      `${WIDGET_NAME}/Info.plist`,
      { target: target.uuid },
      widgetGroupKey
    );

    // Add entitlements
    proj.addResourceFile(
      `${WIDGET_NAME}/MyFastWidget.entitlements`,
      { target: target.uuid },
      widgetGroupKey
    );

    // Configure build settings for the widget target
    const configurations = proj.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const config = configurations[key];
      if (
        typeof config === "object" &&
        config.buildSettings &&
        config.buildSettings.PRODUCT_NAME === `"${WIDGET_NAME}"`
      ) {
        config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
        config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${widgetBundleId}"`;
        config.buildSettings.SWIFT_VERSION = "5.0";
        config.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${WIDGET_NAME}/MyFastWidget.entitlements"`;
        config.buildSettings.TARGETED_DEVICE_FAMILY = '"1"';
        config.buildSettings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = '"AccentColor"';
        config.buildSettings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = '"WidgetBackground"';
        config.buildSettings.GENERATE_INFOPLIST_FILE = "YES";
        config.buildSettings.INFOPLIST_FILE = `"${WIDGET_NAME}/Info.plist"`;
        config.buildSettings.INFOPLIST_KEY_CFBundleDisplayName = '"MyFast Widget"';
        config.buildSettings.INFOPLIST_KEY_NSHumanReadableCopyright = '""';
        config.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        config.buildSettings.MARKETING_VERSION = "1.0";
        config.buildSettings.CURRENT_PROJECT_VERSION = "1";
        config.buildSettings.SKIP_INSTALL = "YES";
      }
    }

    // Add WidgetKit and SwiftUI frameworks to the widget target
    proj.addFramework("WidgetKit.framework", {
      target: target.uuid,
      link: true,
    });
    proj.addFramework("SwiftUI.framework", {
      target: target.uuid,
      link: true,
    });

    return mod;
  });

  return config;
};

module.exports = withWidget;
