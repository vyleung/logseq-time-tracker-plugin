## logseq-time-tracker-plugin

## Core Features
> The **_time tracked_** and **_total time tracked_** are inserted as a block property in the following notation: `hours:minutes:seconds` (e.g. 00:17:32 → 17 minutes and 32 seconds)

### Start and stop tracking time for a <u>_new_</u> or <u>_existing_</u> task in 3 ways:
- Block context menu (right-click on bullet)
- Plugin UI
    - New tasks created via the plugin UI are added to the daily journal page by default (but can be added to a specific page) and can be prepended with your preferred workflow (e.g. TODO/NOW) - these features can be configured in the [settings](#settings)
- Slash (/) command  
#### Demo
![logseq-time-tracker-plugin main demo](screenshots/logseq_time_tracker_main_demo.gif)

### Get and update the total time tracked for a parent task with child(ren) tasks in 2 ways:
- Block context menu (right-click on bullet)
- Slash (/) command  
- After getting the total time tracked for the first time, an inline refresh button will appear to make it easier to update the total time tracked (the color and position of the button can be configured in the [settings](#settings))
    - 🚨&ensp; <u>**NOTE:**</u> Always use the block context menu or slash command to get the inital total time tracked. Please do **NOT** copy and paste `{{renderer :refreshTotalTimeTracked}}` to other blocks.
#### Demo
![logseq-time-tracker-plugin total time tracked demo](screenshots/logseq_time_tracker_totalTimeTracked_demo.gif)

## Extra Features
> These features are **_disabled by default_** and can be configured in the [settings](#settings).

### Show log entries that mirror Logseq's native time tracking functionality
![logseq-time-tracker-plugin vs Logseq's native time tracking](screenshots/plugin_vs_native_timetracking.png) _Task state: TODO (red checkbox)_

### Get notified after a customizable interval of time
- Similar to a pomodoro timer - a **"ding"** sound will play and/or a **system notification** will appear at the end of _**each**_ interval (e.g. every 25 minutes), but the stopwatch will continue to track time until you stop the timer

## Settings
- Each time you make changes to the plugin settings, please reload the plugin to ensure that all settings are updated.  
![logseq-time-tracker-plugin settings](screenshots/logseq_time_tracker_settings.png)

## Installation
### Preparation
1. Click the 3 dots in the righthand corner → `Settings` → `Advanced` → Enable `Plug-in system`
2. Restart Logseq
3. Click the 3 dots → `Plugins` (or use keyboard shortcut `Esc t p`).
### Load plugin via the marketplace (not available yet)

### Load plugin manually
1. Download the latest release of the plugin (.zip file) from Github
2. Unzip the file
3. Navigate to plugins (Click the 3 dots → `Plugins` (or use keyboard shortcut `Esc t p`)) → `Load unpacked plugin` → Select the folder of the unzipped file

## License
MIT

##  Credits
- Plugin Marketplace Icon: <a href="https://www.flaticon.com/free-icons/stopwatch" title="stopwatch icons">Stopwatch icons created by Freepik - Flaticon</a>
- [Plugin Toolbar Icon](https://tablericons.com/)
- [Plugin Start/Stop/Settings Icons](https://feathericons.com/)