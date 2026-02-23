import SwiftUI
import WidgetKit

struct FastEntry: TimelineEntry {
    let date: Date
    let fastState: FastState
}

struct MyFastTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> FastEntry {
        FastEntry(
            date: Date(),
            fastState: FastState(
                state: .fasting,
                startedAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600 * 4)),
                targetHours: 16,
                protocol_: "16:8",
                streakCount: 7
            )
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (FastEntry) -> Void) {
        let state = FastState.load()
        completion(FastEntry(date: Date(), fastState: state))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FastEntry>) -> Void) {
        let state = FastState.load()
        let now = Date()

        // Create entries: current + one at end-of-fast if fasting
        var entries: [FastEntry] = [FastEntry(date: now, fastState: state)]

        if state.state == .fasting, let endDate = state.endDate, endDate > now {
            entries.append(FastEntry(date: endDate, fastState: state))
        }

        // Refresh after 15 minutes or at the target end time
        let refreshDate: Date
        if state.state == .fasting, let endDate = state.endDate, endDate > now {
            refreshDate = min(endDate, now.addingTimeInterval(15 * 60))
        } else {
            refreshDate = now.addingTimeInterval(15 * 60)
        }

        let timeline = Timeline(entries: entries, policy: .after(refreshDate))
        completion(timeline)
    }
}

struct MyFastWidget: Widget {
    let kind = "MyFastWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MyFastTimelineProvider()) { entry in
            MyFastWidgetEntryView(entry: entry)
                .containerBackground(Color.widgetBackground, for: .widget)
        }
        .configurationDisplayName("MyFast Timer")
        .description("Track your intermittent fasting progress.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
