import Foundation
import WidgetKit

/// The fasting state shared between the main app and widget via App Group UserDefaults.
struct FastState: Codable {
    enum State: String, Codable {
        case fasting
        case idle
    }

    let state: State
    let startedAt: String?       // ISO 8601
    let targetHours: Double?
    let protocol_: String?       // "protocol" is reserved in Swift
    let streakCount: Int?
    let lastEndedAt: String?

    enum CodingKeys: String, CodingKey {
        case state
        case startedAt
        case targetHours
        case protocol_ = "protocol"
        case streakCount
        case lastEndedAt
    }

    /// Load from App Group UserDefaults
    static func load() -> FastState {
        guard let defaults = UserDefaults(suiteName: "group.com.myfast.app"),
              let data = defaults.data(forKey: "widgetState"),
              let decoded = try? JSONDecoder().decode(FastState.self, from: data) else {
            return FastState(state: .idle, startedAt: nil, targetHours: nil, protocol_: nil, streakCount: nil, lastEndedAt: nil)
        }
        return decoded
    }

    /// Parse ISO 8601 startedAt into a Date
    var startDate: Date? {
        guard let startedAt else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: startedAt) { return date }
        // Retry without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: startedAt)
    }

    /// Parse ISO 8601 end date into a Date
    var endDateFromLastFast: Date? {
        guard let lastEndedAt else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: lastEndedAt) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: lastEndedAt)
    }

    /// Target duration in seconds
    var targetSeconds: TimeInterval {
        (targetHours ?? 16) * 3600
    }

    /// Predicted end date
    var endDate: Date? {
        guard let start = startDate else { return nil }
        return start.addingTimeInterval(targetSeconds)
    }

    /// Progress fraction (0.0 to 1.0) at a given moment
    func progress(at now: Date = Date()) -> Double {
        guard state == .fasting, let start = startDate else { return 0 }
        let elapsed = now.timeIntervalSince(start)
        guard targetSeconds > 0 else { return 0 }
        return min(max(elapsed / targetSeconds, 0), 1.0)
    }

    /// Whether the target has been reached
    func targetReached(at now: Date = Date()) -> Bool {
        progress(at: now) >= 1.0
    }
}
