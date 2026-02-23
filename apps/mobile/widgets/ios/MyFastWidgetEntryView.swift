import SwiftUI
import WidgetKit

// MARK: - Design Tokens

extension Color {
    static let widgetBackground = Color(red: 0x0D/255, green: 0x0B/255, blue: 0x0F/255)
    static let widgetFasting    = Color(red: 0x14/255, green: 0xB8/255, blue: 0xA6/255)
    static let widgetComplete   = Color(red: 0x22/255, green: 0xC5/255, blue: 0x5E/255)
    static let widgetIdle       = Color(red: 0x5E/255, green: 0x56/255, blue: 0x69/255)
    static let widgetTrack      = Color(red: 0x1E/255, green: 0x1A/255, blue: 0x23/255)
    static let widgetText       = Color(red: 0xF5/255, green: 0xF2/255, blue: 0xF8/255)
    static let widgetSecondary  = Color(red: 0x9B/255, green: 0x92/255, blue: 0xA8/255)
    static let widgetOvertime   = Color(red: 0xD4/255, green: 0x91/255, blue: 0x5E/255)
}

// MARK: - Entry View (routes to small or medium)

struct MyFastWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: FastEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(state: entry.fastState)
        case .systemMedium:
            MediumWidgetView(state: entry.fastState)
        default:
            SmallWidgetView(state: entry.fastState)
        }
    }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let state: FastState

    private var ringColor: Color {
        guard state.state == .fasting else { return .widgetIdle }
        return state.targetReached() ? .widgetComplete : .widgetFasting
    }

    private var progressValue: Double {
        state.progress()
    }

    var body: some View {
        VStack(spacing: 6) {
            // Circular ring with elapsed time inside
            ZStack {
                // Track
                Circle()
                    .stroke(Color.widgetTrack, lineWidth: 6)

                // Progress arc
                Circle()
                    .trim(from: 0, to: CGFloat(progressValue))
                    .stroke(ringColor, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                // Elapsed time (live updating)
                if state.state == .fasting, let start = state.startDate {
                    Text(start, style: .timer)
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundColor(.widgetText)
                        .multilineTextAlignment(.center)
                } else {
                    Text("--:--")
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundColor(.widgetIdle)
                }
            }
            .frame(width: 90, height: 90)

            // Protocol label
            Text(state.state == .fasting ? (state.protocol_ ?? "16:8") : "IDLE")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.widgetSecondary)
                .textCase(.uppercase)

            // Progress %
            Text(state.state == .fasting ? "\(Int(progressValue * 100))%" : "--")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(ringColor)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(URL(string: "myfast://"))
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let state: FastState

    private var ringColor: Color {
        guard state.state == .fasting else { return .widgetIdle }
        return state.targetReached() ? .widgetComplete : .widgetFasting
    }

    private var progressValue: Double {
        state.progress()
    }

    private var stateLabel: String {
        guard state.state == .fasting else { return "IDLE" }
        return state.targetReached() ? "TARGET HIT" : "FASTING"
    }

    var body: some View {
        HStack(spacing: 16) {
            // Left side: ring + elapsed
            VStack(spacing: 4) {
                ZStack {
                    Circle()
                        .stroke(Color.widgetTrack, lineWidth: 7)

                    Circle()
                        .trim(from: 0, to: CGFloat(progressValue))
                        .stroke(ringColor, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                        .rotationEffect(.degrees(-90))

                    if state.state == .fasting, let start = state.startDate {
                        Text(start, style: .timer)
                            .font(.system(size: 24, weight: .bold, design: .monospaced))
                            .foregroundColor(.widgetText)
                            .multilineTextAlignment(.center)
                    } else {
                        Text("--:--")
                            .font(.system(size: 24, weight: .bold, design: .monospaced))
                            .foregroundColor(.widgetIdle)
                    }
                }
                .frame(width: 100, height: 100)

                Text(stateLabel)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(ringColor)
                    .textCase(.uppercase)
                    .tracking(1)
            }

            // Right side: details
            VStack(alignment: .leading, spacing: 8) {
                DetailRow(
                    label: "Protocol",
                    value: state.protocol_ ?? "--"
                )

                DetailRow(
                    label: "Target",
                    value: state.state == .fasting
                        ? formatHours(state.targetHours ?? 16)
                        : "--"
                )

                DetailRow(
                    label: "Ends at",
                    value: state.state == .fasting
                        ? formatEndTime(state.endDate)
                        : "--"
                )

                DetailRow(
                    label: "Streak",
                    value: state.streakCount.map { "\($0) day\($0 != 1 ? "s" : "")" } ?? "--"
                )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 4)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(URL(string: "myfast://"))
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(.widgetSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.widgetText)
        }
    }
}

// MARK: - Helpers

private func formatHours(_ hours: Double) -> String {
    let h = Int(hours)
    let m = Int((hours - Double(h)) * 60)
    if m == 0 {
        return "\(h)h"
    }
    return "\(h)h \(m)m"
}

private func formatEndTime(_ date: Date?) -> String {
    guard let date else { return "--" }
    let formatter = DateFormatter()
    formatter.dateFormat = "h:mm a"
    return formatter.string(from: date)
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    MyFastWidget()
} timeline: {
    FastEntry(
        date: Date(),
        fastState: FastState(
            state: .fasting,
            startedAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600 * 8)),
            targetHours: 16,
            protocol_: "16:8",
            streakCount: 14
        )
    )
    FastEntry(
        date: Date(),
        fastState: FastState(state: .idle, startedAt: nil, targetHours: nil, protocol_: nil, streakCount: nil)
    )
}

#Preview("Medium", as: .systemMedium) {
    MyFastWidget()
} timeline: {
    FastEntry(
        date: Date(),
        fastState: FastState(
            state: .fasting,
            startedAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600 * 8)),
            targetHours: 16,
            protocol_: "16:8",
            streakCount: 14
        )
    )
}
