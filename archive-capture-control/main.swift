import Cocoa
import Darwin

@main
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let label = "com.jiho.archive-capture-receiver"
    private let plistPath = "/Users/ji-ho/Library/LaunchAgents/com.jiho.archive-capture-receiver.plist"
    private var statusItem: NSStatusItem!
    private var stateItem: NSMenuItem!

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.title = "ARC"

        let menu = NSMenu()
        stateItem = NSMenuItem(title: "Receiver: checking…", action: nil, keyEquivalent: "")
        stateItem.isEnabled = false
        menu.addItem(stateItem)
        menu.addItem(NSMenuItem.separator())
        menu.addItem(withTitle: "Start receiver", action: #selector(startReceiver), keyEquivalent: "s")
        menu.addItem(withTitle: "Stop receiver", action: #selector(stopReceiver), keyEquivalent: "x")
        menu.addItem(withTitle: "Refresh status", action: #selector(refreshStatus), keyEquivalent: "r")
        menu.addItem(NSMenuItem.separator())
        menu.addItem(withTitle: "Quit ARC", action: #selector(quit), keyEquivalent: "q")
        statusItem.menu = menu
        refreshStatus()
    }

    private var domain: String { "gui/\(getuid())" }
    private var serviceTarget: String { "\(domain)/\(label)" }

    private func launchctl(_ arguments: [String]) -> (Int32, String) {
        let process = Process()
        let pipe = Pipe()
        process.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        process.arguments = arguments
        process.standardOutput = pipe
        process.standardError = pipe
        do {
            try process.run()
            process.waitUntilExit()
            let output = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
            return (process.terminationStatus, output)
        } catch {
            return (1, error.localizedDescription)
        }
    }

    private func receiverIsRunning() -> Bool {
        launchctl(["print", serviceTarget]).0 == 0
    }

    @objc private func refreshStatus() {
        let running = receiverIsRunning()
        stateItem.title = running ? "Receiver: running" : "Receiver: stopped"
        statusItem.button?.title = running ? "ARC" : "ARC·"
    }

    @objc private func startReceiver() {
        if receiverIsRunning() {
            showMessage("Archive Capture is already running.")
            return
        }
        let result = launchctl(["bootstrap", domain, plistPath])
        refreshStatus()
        if result.0 != 0 { showMessage("Could not start receiver:\n\(result.1)") }
    }

    @objc private func stopReceiver() {
        let result = launchctl(["bootout", serviceTarget])
        refreshStatus()
        if result.0 != 0 { showMessage("Could not stop receiver:\n\(result.1)") }
    }

    @objc private func quit() { NSApp.terminate(nil) }

    private func showMessage(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "Archive Capture"
        alert.informativeText = message
        alert.runModal()
    }
}
