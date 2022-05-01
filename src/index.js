import "@logseq/libs";
import {setDriftlessTimeout, setDriftlessInterval, clearDriftless} from "driftless";
import {format, getUnixTime} from "date-fns";
import * as textFieldEdit from 'text-field-edit';
import { __esModule } from "driftless";

let h;
let m;
let s;
let day;
let hr;
let min;
let sec;
let hours;
let minutes;
let seconds;

let stopwatch_hr_duration;
let stopwatch_min_duration;
let stopwatch_sec_duration;
let pomo_hr_duration;
let pomo_min_duration;
let pomo_sec_duration;
let pomo_hr_tracked;
let pomo_min_tracked;
let pomo_sec_tracked;
let total_time_tracked_sec;

let first_start = true;
let pause = true;
let pomo_break = false;
let pomo_end = false;
let timer;
let task_name;
let duration;
let duration_tracked;
let pomo_notif_active;
let pomo_notif;
let system_notif_active;
let system_notif;
let pomo_duration;
let pomo_interval;
let time_elapsed_pomo;

let todays_journal_title;
let workflow_format;
let selected_task_uuid;
let block_uuid;
let last_block_uuid;
let created_block_uuid;
let block_content;

let start_time;
let current_time;
let time_elapsed_stopwatch;
let log_entry_start;
let log_entry_stop;

const app = document.getElementById("app");
const add_task = document.getElementById("add-task");
const start_button = document.getElementById("start-button");
const stop_button = document.getElementById("stop-button");
const settings_button = document.getElementById("settings-button");
const notif_sound = document.getElementById("pomo-notif");
const refresh_renderer = "{{renderer :refreshTotalTimeTracked}}";
let settings = [
  {
    key: "!",
    title: "NOTE",
    description: "Please refresh Logseq/reload the plugin after changing any settings to ensure that they're saved properly",
    type: "object"
  },
  {
    key: "KeyboardShortcut_Timer",
    title: "Keyboard shortcut to start/stop the timer",
    description: "This is the keyboard shortcut used to start/stop the timer (default: ctrl+s)",
    type: "string",
    default: "ctrl+s"
  },
  {
    key: "KeyboardShortcut_getTotalTimeTracked",
    title: "Keyboard shortcut to get/update the total time tracked",
    description: "This is the keyboard shortcut used to get/update the total time tracked (default: ctrl+g)",
    type: "string",
    default: "ctrl+g"
  },
  {
    key: "DefaultMode",
    title: "Default mode of time tracker?",
    description: "Would you like the default mode of the time tracker to be a stopwatch (counts up) or a pomodoro timer (counts down)?",
    default: "stopwatch",
    enumPicker: "radio",
    enumChoices: ["stopwatch", "pomodoro timer"],
    type: "enum"
  },
  {
    key: "Logs",
    title: "Show log entries?",
    description: "Check the box if you would like each log entry stored under the :LOG-ENTRIES: drawer",
    default: false,
    type: "boolean",
    enumPicker: "checkbox"
  },
  {
    key: "Workflow",
    title: "Prepend workflow to task?",
    description: "Check the box if you would like to prepend new tasks with your preferred workflow (e.g. TODO/NOW)",
    default: false,
    type: "boolean",
    enumPicker: "checkbox"
  },
  {
    key: "AddtoPage",
    title: "Add task to mentioned page?",
    description: "Check the box if you would like to add the new task to the page mentioned in the task. If unchecked, the task will be added to the daily journal page",
    default: false,
    type: "boolean",
    enumPicker: "checkbox"
  },
  {
    key: "PomoNotification_System",
    title: "Get a system notification every X minutes?",
    description: 'Check the box if you would like to receive a system notification after every X minutes',
    default: false,
    type: "boolean",
    enumPicker: "checkbox"
  },
  {
    key: "PomoNotification_Plugin",
    title: "Get notified every X minutes?",
    description: 'Check the box if you would like to hear a "ding" after every X minutes',
    default: false,
    type: "boolean",
    enumPicker: "checkbox"
  },
  {
    key: "PomoDuration",
    title: "Pomo interval duration?",
    description: "Enter a duration in minutes (e.g. 90 for 1.5 hours)",
    default: 25,
    type: "number"
  },
  {
    key: "PomoBreakDuration",
    title: "Pomo break duration?",
    description: "Enter a duration in minutes (e.g. 90 for 1.5 hours)",
    default: 5,
    type: "number"
  },
  {
    key: "NotifVolume",
    title: "Volume level of notification?",
    description: 'How loud would you like the "ding" sound to be?',
    default: "normal",
    enumPicker: "radio",
    enumChoices: ["quiet", "normal", "loud"],
    type: "enum"
  },
  {
    key: "AfterPomoEnd",
    title: "What happens after the pomodoro interval ends?",
    description: "Start a break and after the break ends, start another pomodoro interval – OR – Stop the pomodoro timer",
    default: "break, then start another timer",
    enumPicker: "radio",
    enumChoices: ["break, then start another timer", "stop timer"],
    type: "enum"
  },
  {
    key: "RefreshButtonColor",
    title: "Color of the refresh button?",
    description: "This is the color of the refresh button (default: #F7BF18)",
    type: "string",
    default: "#F7BF18"
  },
  {
    key: "RefreshButtonMarginTop",
    title: "Margin-top for the refresh button?",
    description: "This is used to align the refresh button with text content in the blocks (default: -2.75em) - To move the button up, make the number more negative (e.g. -3.5em). To move the button down, make the number more positive (e.g. -1.5em)",
    type: "string",
    default: "-2.75em"
  },
  {
    key: "ActiveTaskEmoji",
    title: "Emoji to indicate active task?",
    description: "Add an emoji as a visual indicator of the task that's being time tracked (default: ⏱). Leave this setting blank if you don't want an emoji to be shown",
    type: "string",
    default: "⏱"
  }
]
logseq.useSettingsSchema(settings);

function addTimeTracked() {
  // existing time tracked = h + m + s 
  if (pomo_end == true) {
    total_time_tracked_sec = (time_elapsed_pomo == 0) ? ((h + m + s) + time_elapsed_stopwatch) : ((h + m + s) + time_elapsed_pomo - 1);
  }
  else {
    total_time_tracked_sec = (time_elapsed_pomo == 0) ? ((h + m + s) + time_elapsed_stopwatch) : ((h + m + s) + time_elapsed_pomo);
  }
  
  hours = Math.floor(total_time_tracked_sec/3600);
  minutes = Math.floor((total_time_tracked_sec/60) % 60);
  seconds = Math.floor(total_time_tracked_sec % 60);

  // hours
  hours = (hours.toString().length == 1) ? `0${hours}` : `${hours}`;

  // minutes
  minutes = (minutes.toString().length == 1) ? `0${minutes}` : `${minutes}`;

  // seconds
  seconds = (seconds.toString().length == 1) ? `0${seconds}` : `${seconds}`;
}

function getTotalTimeTracked(e) {
  let parent_time_entry = 0;
  let children_time_entry = 0;
  let time_tracked_total = 0;
  let parent_block_content;

  if (e.uuid == undefined) {
    // gets the block uuid that the refresh button is located in
    if (e.dataset.refreshUuid == undefined) {
      logseq.App.showMsg("No parent task selected", "warning");
    }
    else {
      e.uuid = e.dataset.refreshUuid;
    }
  }

  logseq.Editor.getBlockProperties(e.uuid).then(block_property => {
    // if the parent block does NOT have any block properties
    if (block_property == null) {
      parent_time_entry = 0;
    }
    // if the parent block does have block properties
    else {
      // if the parent block contains both the time-tracked and time-tracked-total properties – OR – if it only has the time-tracked property, only add the time-tracked
      if (((block_property.timeTracked) && (block_property.timeTrackedTotal)) || ((block_property.timeTracked) && (block_property.timeTrackedTotal == undefined))) {
        parent_time_entry += parseInt(block_property.timeTracked.split(":")[0]*3600) + parseInt(block_property.timeTracked.split(":")[1]*60) + parseInt(block_property.timeTracked.split(":")[2]);
      }
      // if the parent block has neither the time-tracked or time-tracked-total properties – OR – if it only has the time-tracked-total property, parent_time_entry = 0 to prevent the time-tracked-total from being updated when the refresh button is clicked
      else {  
        parent_time_entry = 0;
      }
    }
  });

  // ref for traversing through a block and their children: https://gist.github.com/umidjons/6865350#file-walk-dom-js
  logseq.Editor.getBlock(e.uuid, {includeChildren: true}).then(parent_block => {
    function loop(block) {
      logseq.Editor.getBlock(block.uuid, {includeChildren: true}).then(tree_block => {
        // if the block has children
        if (tree_block.children.length > 0) {
          tree_block.children.forEach(child_block => {
            logseq.Editor.getBlockProperties(child_block.uuid).then(block_properties => {
              // if the child block contains both the time-tracked and time-tracked-total properties – OR – if it only has the time-tracked-total property, add the time-tracked-total
              if (((block_properties.timeTracked) && (block_properties.timeTrackedTotal)) || ((block_properties.timeTracked == undefined) && (block_properties.timeTrackedTotal))) {
                children_time_entry += parseInt(block_properties.timeTrackedTotal.split(":")[0]*3600) + parseInt(block_properties.timeTrackedTotal.split(":")[1]*60) + parseInt(block_properties.timeTrackedTotal.split(":")[2]);
              }
              // if the child block contains only the time-tracked property, add the time-tracked
              else if ((block_properties.timeTracked) && (block_properties.timeTrackedTotal == undefined)) {
                children_time_entry += parseInt(block_properties.timeTracked.split(":")[0]*3600) + parseInt(block_properties.timeTracked.split(":")[1]*60) + parseInt(block_properties.timeTracked.split(":")[2]);
              }
            });
            loop(child_block);
          });
        } 
        //  add the time tracked of the parent block and its child(ren) blocks to get total tracked time
        time_tracked_total = parent_time_entry + children_time_entry;
      });
    }
    parent_block_content = parent_block.content;
    loop(parent_block);

    setDriftlessTimeout(() => {
      // convert total time tracked to 00:00:00
      if (time_tracked_total <= 86399) {
        hr = Math.floor(time_tracked_total/3600);
        min = Math.floor((time_tracked_total/60) % 60);
        sec = Math.floor(time_tracked_total % 60);
      }
      else {
        // convert total time tracked to 00:00:00:00
        day = Math.floor(time_tracked_total/86400);
        hr = Math.floor(((time_tracked_total/3600) % 60) % 24);
        min = Math.floor((time_tracked_total/60) % 60);
        sec = Math.floor(time_tracked_total % 60);
      }
  
      if (time_tracked_total == 0) {
        // logseq.App.showMsg("No time tracked", "warning");
        console.log('0');
      }
      // 00:00:seconds
      else if ((time_tracked_total >= 1) && (time_tracked_total <= 59)) {
        sec = (time_tracked_total.toString().length == 1) ? `0${time_tracked_total}`: `${time_tracked_total}`;
  
        logseq.Editor.getBlockProperty(e.uuid, "time-tracked-total").then(a => {
          // if the block does NOT have the time-tracked-total property
          if (a == null) {
            logseq.Editor.updateBlock(e.uuid, `${parent_block_content}\ntime-tracked-total:: 00:00:${sec} ${refresh_renderer}`);
          }
          // if the block does have the time-tracked-total property
          else {
            logseq.Editor.upsertBlockProperty(e.uuid, "time-tracked-total", `00:00:${sec} ${refresh_renderer}`);
          }
        });
      }
  
      // 00:minutes:seconds
      else if ((time_tracked_total >= 60) && (time_tracked_total <= 3599)) {
        // minutes
        min = (min.toString().length == 1) ? `0${min}` : `${min}`;
  
        // seconds
        sec = (sec.toString().length == 1) ? `0${sec}` : `${sec}`;
  
        logseq.Editor.getBlockProperty(e.uuid, "time-tracked-total").then(b => {
          // if the block does NOT have the time-tracked-total property
          if (b == null) {
            logseq.Editor.updateBlock(e.uuid, `${parent_block_content}\ntime-tracked-total:: 00:${min}:${sec} ${refresh_renderer}`);
          }
          // if the block does have the time-tracked-total property
          else {
            logseq.Editor.upsertBlockProperty(e.uuid, "time-tracked-total", `00:${min}:${sec} ${refresh_renderer}`);
          }
        });
      }
  
      // hours:minutes:seconds
      else if ((time_tracked_total >= 3600) && (time_tracked_total <= 86399)) {
        // hours
        hr = (hr.toString().length == 1) ? `0${hr}` : `${hr}`;
  
        // minutes
        min = (min.toString().length == 1) ? `0${min}` : `${min}`;
  
        // seconds
        sec = (sec.toString().length == 1) ? `0${sec}` : `${sec}`;
  
        logseq.Editor.getBlockProperty(e.uuid, "time-tracked-total").then(c => {
          // if the block does NOT have the time-tracked-total property
          if (c == null) {
            logseq.Editor.updateBlock(e.uuid, `${parent_block_content}\ntime-tracked-total:: ${hr}:${min}:${sec} ${refresh_renderer}`);
          }
          // if the block does have the time-tracked-total property
          else {
            logseq.Editor.upsertBlockProperty(e.uuid, "time-tracked-total", `${hr}:${min}:${sec} ${refresh_renderer}`);
          }
        });
      }
  
      // days:hours:minutes:seconds
      else if (time_tracked_total >= 84600) {
        // days
        day = (day.toString().length == 1) ? `0${day}` : `${day}`;
  
        // hours
        hr = (hr.toString().length == 1) ? `0${hr}` : `${hr}`;
  
        // minutes
        min = (min.toString().length == 1) ? `0${min}` : `${min}`;
  
        // seconds
        sec = (sec.toString().length == 1) ? `0${sec}` : `${sec}`;
  
        logseq.Editor.getBlockProperty(e.uuid, "time-tracked-total").then(d => {
          // if the block does NOT have the time-tracked-total property
          if (d == null) {
            logseq.Editor.updateBlock(e.uuid, `${parent_block_content}\ntime-tracked-total:: ${day}:${hr}:${min}:${sec} ${refresh_renderer}`);
          }
          // if the block does have the time-tracked-total property
          else {
            logseq.Editor.upsertBlockProperty(e.uuid, "time-tracked-total", `${day}:${hr}:${min}:${sec} ${refresh_renderer}`);
          }
        });
      }
    }, 500);
  });
}

function notifSoundVolume() {
  if (logseq.settings.NotifVolume == "quiet") {
    notif_sound.volume = 0.25;
  }
  else if (logseq.settings.NotifVolume == "normal") {
    notif_sound.volume = 0.5;
  }
  else {
    notif_sound.volume = 1.0;
  }
}

function startTimerBasics() {
  pause = false;
  start_time = getUnixTime(new Date());
  logseq.hideMainUI();
  app.style.display = "block";
  add_task.style.display = "none";
  stop_button.style.display = "block";
  start_button.style.display = "none";
  log_entry_start = format(new Date(), "yyyy-MM-dd EEE HH:mm:ss");
  time_elapsed_stopwatch = 0;
  time_elapsed_pomo = 0;

  if (first_start == true) {
    logseq.App.showMsg("Timer started");

    setDriftlessTimeout(() => {
      first_start = false;
    }, 25);
  }

  if (pomo_break == false) {
    pomo_interval = (pomo_duration * 60);
  }
  else {
    pomo_interval = (logseq.settings.PomoBreakDuration * 60);
  }

  // default mode: stopwatch
  if (logseq.settings.DefaultMode == "stopwatch") {
    timer = setDriftlessInterval(() => updateStopwatch(), 1000);
  }
  // default mode: pomodoro timer
  else if (logseq.settings.DefaultMode == "pomodoro timer") {
    timer = setDriftlessInterval(() => updatePomoTimer(), 1000);
  }

  // "ding" sound and system notification
  if (pomo_notif_active && system_notif_active) {
    notifSoundVolume();
    pomo_notif = setDriftlessInterval(() => notif_sound.play(), (pomo_duration * 60000));
    system_notif = setDriftlessInterval(() => new Notification(`${duration_tracked} has passed`), (pomo_duration * 60000));
  }
  else if (pomo_notif_active && !system_notif_active) {
    notifSoundVolume();
    pomo_notif = setDriftlessInterval(() => notif_sound.play(), (pomo_duration * 60000));
  }
  else if (!pomo_notif_active && system_notif_active) {
    system_notif = setDriftlessInterval(() => new Notification(`${duration_tracked} has passed`), (pomo_duration * 60000));
  }

  // removes timer mode and shows the stopwatch emoji next to the task
  logseq.provideStyle(`
    #timer-mode {
      display: none;
    }
    #block-content-${selected_task_uuid} > .flex.flex-row.justify-between > .flex-1 > span.inline::after {
      content: "${logseq.settings.ActiveTaskEmoji}";
      padding-left: 0.5em;
      font-size: 1.1em;
    }
  `);
}

function stopTimerBasics() {
  pause = true;
  clearDriftless(timer);
  clearDriftless(pomo_notif);
  clearDriftless(system_notif);
  logseq.hideMainUI();
  app.style.display = "none";
  add_task.style.display = "block";
  add_task.value = "";
  add_task.placeholder = 'Add a new task';
  stop_button.style.display = "none";
  start_button.style.display = "block";
  log_entry_stop = format(new Date(), "yyyy-MM-dd EEE HH:mm:ss");

  // shows timer mode and removes the stopwatch emoji next to the task
  logseq.provideStyle(`
    #timer-mode {
      display: block;
    }
    #block-content-${selected_task_uuid} > .flex.flex-row.justify-between > .flex-1 > span.inline::after {
      content: "";
    }
  `);
}

function startTimer(e) {
  selected_task_uuid = e.uuid;
  startTimerBasics();

  logseq.Editor.getBlock(e.uuid).then(selectedBlock => {
    block_content = selectedBlock.content;
    // update block w/ time-tracked property if the property doesn't exist
    if (block_content.includes("time-tracked::") == false) {
        logseq.Editor.upsertBlockProperty(selectedBlock.uuid, "time-tracked", "00:00:00");
    }
    else {
      block_content = block_content.split("time-tracked::")[0];
    }
    app.textContent = block_content;
  });
}

function stopTimer(e) {
  stopTimerBasics();
  
  logseq.Editor.getBlock(e.uuid).then(thisBlock => {
    logseq.Editor.getBlockProperty(thisBlock.uuid, "time-tracked").then(time => {
      // new task
      if (time == "00:00:00") {
        // updates the block w/ the log entry
        if (logseq.settings.Logs) {
          block_content = `${block_content}\n\n:LOG-ENTRIES:\nCLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration_tracked}\n:END:`;
          logseq.Editor.updateBlock(thisBlock.uuid, block_content);
        }

        setDriftlessTimeout(() => {
          // updates time-tracked property
          logseq.Editor.upsertBlockProperty(thisBlock.uuid, "time-tracked", `${duration_tracked}`);
        }, 25);
      }
      // existing task w/ previously tracked time
      else {
        // 00:00:00
        h = parseInt(time.split(":")[0]) * 3600; // hour
        m = parseInt(time.split(":")[1]) * 60; // minute
        s = parseInt(time.split(":")[2]); // second
        addTimeTracked();

        // updates the block w/ the log entry
        if (logseq.settings.Logs) {
          // if the block content contains ":LOG-ENTRIES:"
          if (thisBlock.content.includes(":LOG-ENTRIES:")) {
            block_content = (thisBlock.content).split(":END:")[0];
            logseq.Editor.updateBlock(thisBlock.uuid, `${block_content}CLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration_tracked}\n:END:`); 
          }
          // if the block content doesn't contain ":LOG-ENTRIES:"
          else {
            logseq.Editor.updateBlock(thisBlock.uuid, `${block_content}\n:LOG-ENTRIES:\nCLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration_tracked}\n:END:`);
          }
        }

        // updates the time-tracked property
        setDriftlessTimeout(() => {
          logseq.Editor.upsertBlockProperty(thisBlock.uuid, "time-tracked", `${hours}:${minutes}:${seconds}`);
        }, 25);
      }
    });
  });

  // removes stopwatch: duration (if displayed)
  logseq.provideUI ({
    key: "stopwatch-duration",
    path: "#toolbar-duration",
    template: `<div id="toolbar-duration" style="display:none;"></div>`
  });

  // removes pomodoro timer: duration (if displayed)
  logseq.provideUI ({
    key: "pomoTimer-duration",
    path: "#toolbar-duration",
    template: `<div id="toolbar-duration" style="display:none;"></div>`
  });
}

function updateStopwatch() {
  current_time = getUnixTime(new Date());
  time_elapsed_stopwatch = (current_time - start_time);
  stopwatch_hr_duration = Math.floor(time_elapsed_stopwatch/3600);
  stopwatch_min_duration = Math.floor((time_elapsed_stopwatch/60) % 60);
  stopwatch_sec_duration = time_elapsed_stopwatch % 60;

  if ((Number.isInteger(start_time)) && (pause == false)) {
    // 00:00:seconds
    if (time_elapsed_stopwatch <= 59) {
      stopwatch_sec_duration = (stopwatch_sec_duration.toString().length == 1) ? `0${stopwatch_sec_duration}` : `${stopwatch_sec_duration}`;

      duration = `00:00:${stopwatch_sec_duration}`;
      duration_tracked = duration;
    }

    // 00:minutes:seconds
    else if ((time_elapsed_stopwatch >= 60) && (time_elapsed_stopwatch <= 3599)) {
      // minutes
      stopwatch_min_duration = (stopwatch_min_duration.toString().length == 1) ? `0${stopwatch_min_duration}` : `${stopwatch_min_duration}`;

      // seconds
      stopwatch_sec_duration = (stopwatch_sec_duration.toString().length == 1) ? `0${stopwatch_sec_duration}` : `${stopwatch_sec_duration}`;

      duration = `00:${stopwatch_min_duration}:${stopwatch_sec_duration}`;
      duration_tracked = duration;
    }

    // hours:minutes:seconds
    else if ((time_elapsed_stopwatch >= 3600) && (time_elapsed_stopwatch <= 86,399)) {
      // hours
      stopwatch_hr_duration = (stopwatch_hr_duration.toString().length == 1) ? `0${stopwatch_hr_duration}` : `${stopwatch_hr_duration}`;

      // minutes
      if (stopwatch_min_duration == 0) {
        stopwatch_min_duration = "00";
      }
      else {
        stopwatch_min_duration = (stopwatch_min_duration.toString().length == 1) ? `0${stopwatch_min_duration}` : `${stopwatch_min_duration}`;
      }
  
      // seconds 
      if (stopwatch_sec_duration == 0) {
        stopwatch_sec_duration = "00";
      }
      else {
        stopwatch_sec_duration = (stopwatch_sec_duration.toString().length == 1) ? `0${stopwatch_sec_duration}` : `${stopwatch_sec_duration}`;
      }

      duration = `${stopwatch_hr_duration}:${stopwatch_min_duration}:${stopwatch_sec_duration}`;
      duration_tracked = duration;
    }

    // if timer is running for 24 hours
    else {
      duration = "ERROR (24 hr limit)";
    }
  }

  // inserts stopwatch duration next to toolbar icon
  logseq.provideUI ({
    key: "stopwatch-duration",
    path: "#toolbar-duration",
    template: `<a data-on-click="stop" class="button" id="stopwatch" style="font-size:0.3em; padding-left:0.3em; margin-top:0.25em; font-weight:600; font-family:Lucida Console, Consolas, monospace">${duration}</a>`
  });
}

function updatePomoTimer() {
  if (!pause)  {
    if (pomo_break == false) {
      // increment time_elapsed_pomo to be formatted for and displayed in the time-tracked property
      time_elapsed_pomo++;
    }
    else {
      time_elapsed_pomo = 0;
    }

    // decrement pomo_interval to be formatted for and displayed in the toolbar
    pomo_interval--;
   
    // pomodoro timer: hours_duration
    pomo_hr_duration = Math.floor(pomo_interval/3600);
    pomo_hr_duration = (pomo_hr_duration.toString().length == 1) ? `0${pomo_hr_duration}`: `${pomo_hr_duration}`;
    // pomodoro timer: seconds_duration
    pomo_sec_duration = pomo_interval % 60;
    pomo_sec_duration = (pomo_sec_duration.toString().length == 1) ? `0${pomo_sec_duration}` : `${pomo_sec_duration}`;
    // pomodoro timer: hours_tracked
    pomo_hr_tracked = Math.floor(time_elapsed_pomo/3600);
    pomo_hr_tracked = (pomo_hr_tracked.toString().length == 1) ? `0${pomo_hr_tracked}` : `${pomo_hr_tracked}`;
    // pomodoro timer: seconds_tracked
    pomo_sec_tracked = time_elapsed_pomo % 60;
    pomo_sec_tracked = (pomo_sec_tracked.toString().length == 1) ? `0${pomo_sec_tracked}` : `${pomo_sec_tracked}`;

    // if the duration of the pomodoro interval is less than an hour
    if ((pomo_duration <= 59) && (pomo_interval > -1)) {
      // pomodoro timer: minutes_duration
      pomo_min_duration = Math.floor(pomo_interval/60);
      pomo_min_duration = (pomo_min_duration.toString().length == 1) ? `0${pomo_min_duration}` : `${pomo_min_duration}`;
      // format the duration displayed in the toolbar
      duration = `${pomo_hr_duration}:${pomo_min_duration}:${pomo_sec_duration}`;

      // pomodoro timer: minutes_tracked
      pomo_min_tracked = Math.floor(time_elapsed_pomo/60);
      pomo_min_tracked = (pomo_min_tracked.toString().length == 1) ? `0${pomo_min_tracked}` : `${pomo_min_tracked}`;
      // format the duration displayed in the time-tracked property
      duration_tracked = `${pomo_hr_tracked}:${pomo_min_tracked}:${pomo_sec_tracked}`;

      // inserts pomodoro timer duration next to toolbar icon
      logseq.provideUI ({
        key: "pomoTimer-duration",
        path: "#toolbar-duration",
        template: `<a data-on-click="stop" class="button" id="stopwatch" style="font-size:0.3em; padding-left:0.3em; margin-top:0.25em; font-weight:600; font-family:Lucida Console, Consolas, monospace">${duration}</a>`
      });
    }
    // if the duration of the pomodoro interval is greater than an hour
    else if ((pomo_duration >= 60) && (pomo_interval > -1)) {
      // pomodoro timer: minutes_duration
      pomo_min_duration = Math.floor((pomo_interval % 3600)/60);
      pomo_min_duration = (pomo_min_duration.toString().length == 1) ? `0${pomo_min_duration}` : `${pomo_min_duration}`;
      // format the duration displayed in the toolbar
      duration = `${pomo_hr_duration}:${pomo_min_duration}:${pomo_sec_duration}`;

      // pomodoro timer: minutes_tracked
      pomo_min_tracked = Math.floor((time_elapsed_pomo % 3600)/60);
      pomo_min_tracked = (pomo_min_tracked.toString().length == 1) ? `0${pomo_min_tracked}` : `${pomo_min_tracked}`;
      // format the duration displayed in the time-tracked property
      duration_tracked = `${pomo_hr_tracked}:${pomo_min_tracked}:${pomo_sec_tracked}`;

      // inserts pomodoro timer duration next to toolbar icon
      logseq.provideUI ({
        key: "pomoTimer-duration",
        path: "#toolbar-duration",
        template: 
        `<div>
          <a class="button" data-on-click="stop">${duration}</a>
        </div>`
      });
    }
    // if there's no time left to count down
    else if (pomo_interval == -1) {
      pomo_end = true;
      
      if (logseq.settings.AfterPomoEnd == "break, then start another timer") {
        if (pomo_break == false) {
           // get task name
          task_name = app.textContent;

          // stop pomo timer
          setDriftlessTimeout(() => {
            stop_button.click();
          }, 25);
          
          // add task to the plugin UI and set the interval to the break duration
          setDriftlessTimeout(() => {
            add_task.value = task_name;
            pomo_interval = (logseq.settings.PomoBreakDuration * 60);
          }, 50);

          setDriftlessTimeout(() => {
            // start the timer for the break
            start_button.click();

            // preparation to start the next timer
            pomo_break = true;

            logseq.App.showMsg("Break started");
          }, 100);
        }

        else {
          task_name = app.textContent;

          setDriftlessTimeout(() => {
            stop_button.click();

            // removes pomodoro timer: duration
            logseq.provideUI ({
              key: "pomoTimer-duration",
              path: "#toolbar-duration",
              template: `<div id="toolbar-duration" style="display:none;"></div>`
            });
          }, 25);

          setDriftlessTimeout(() => {
            add_task.value = task_name;
            pomo_interval = (pomo_duration * 60);
          }, 50);

          setDriftlessTimeout(() => {
            // start another the timer for the task
            start_button.click();

            // preparation to start the next break
            pomo_break = false;

            logseq.App.showMsg("Break ended");
          }, 100);
        }
      }

      else if (logseq.settings.AfterPomoEnd == "stop timer") {
        pause = true;

        setDriftlessTimeout(() => {
          stop_button.click();
        }, 25);
      }
    }
  }
}

const main = async () => {
  console.log("logseq-time-tracker-plugin loaded");

  // for refresh button
  const refresh_button_color = logseq.settings.RefreshButtonColor;
  const refresh_button_margin_top = logseq.settings.RefreshButtonMarginTop;

  logseq.App.onMacroRendererSlotted(async ({slot, payload}) => {
    let [renderer] = payload.arguments;

    if (renderer.startsWith(":refreshTotalTimeTracked")) {
      // add the refresh button next to the time-tracked-total property
      logseq.provideUI({
        key: slot,
        slot,
        path: `div[id^='ls-block'][id$='${payload.uuid}']`,
        template: 
        `<a data-on-click="refresh" class="button refresh" data-refresh-uuid="${payload.uuid}">
          <svg id="icon" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-refresh" width="22" height="22" viewBox="0 0 24 24" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
            <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
          </svg>
        </a>`,
        reset: true
      });
      
      // style the refresh button
      logseq.provideStyle(`
        a.button.refresh {
          opacity: 0.75 !important;
          height: 0 !important;
          padding: 0 !important;
          margin-left: 0.15em !important;
        }
        a.button.refresh.active, a.button.refresh:hover {
          opacity: 1 !important;
          background: transparent;
        }
        #icon {
          stroke: ${refresh_button_color};
          margin-top: ${refresh_button_margin_top};
        }
      `) 
    } 
  });
  
  // get pomodoro timer duration
  if (logseq.settings.PomoDuration != "") {
    pomo_duration = logseq.settings.PomoDuration;
  }

  // pomo notif and duration settings
  if ((logseq.settings.PomoNotification_Plugin) && (logseq.settings.PomoDuration != "")) {
    pomo_duration = logseq.settings.PomoDuration;
    pomo_notif_active = true;
  }
  else {
    pomo_notif_active = false;
  } 

  // system notif settings
  if ((logseq.settings.PomoNotification_System) && (logseq.settings.PomoDuration != "")) {
    pomo_duration = logseq.settings.PomoDuration;
    system_notif_active = true;
  }
  else {
    system_notif_active = false;
  } 
 
  // if timer is running, prevent the window from being refreshed and show a message
  window.addEventListener("beforeunload", function (e) {
    if (pause == false) {
      e.returnValue = false;
      logseq.App.showMsg("Don't forget to stop the timer", "warning");
    }
  });

  function darkMode() {
    document.getElementById("container").setAttribute("style", "background-color:#191919");
    add_task.setAttribute("style", "background-color:#191919; color:#CDCDCD");
    add_task.addEventListener("focus", () => {
      add_task.setAttribute("style", "background-color:#191919; color:#CDCDCD; outline:2px solid #3B3B3B;");
    });
    add_task.addEventListener("blur", () => {
      add_task.setAttribute("style", "background-color:#191919; color:#CDCDCD; outline:none;");
    });
    app.setAttribute("style", "background-color:#191919; color:#CDCDCD; border:2px solid #3B3B3B");
  }

  function lightMode() {
    document.getElementById("container").setAttribute("style", "background-color:#FFFFFF");
    add_task.setAttribute("style", "background-color:#FFFFFF; color:#6B6B6B;");
    add_task.addEventListener("focus", () => {
      add_task.setAttribute("style", "background-color:#FFFFFF; color:#6B6B6B; outline:2px solid #D1D1D1;");
    });
    add_task.addEventListener("blur", () => {
      add_task.setAttribute("style", "background-color:#FFFFFF; color:#6B6B6B; outline:none;");
    });
    app.setAttribute("style", "background-color:#FFFFFF; color:#6B6B6B; border:2px solid #D1D1D1");
  }

  logseq.App.getUserConfigs().then(configs => {
    // formats date in user's preferred date format
    todays_journal_title = format(new Date(), configs.preferredDateFormat);

    // adds workflow in user's preferred workflow format
    workflow_format = (configs.preferredWorkflow).toUpperCase();

    // dark/light mode based on user's preferred theme mode
    if (configs.preferredThemeMode == "dark") {
      darkMode();
    }
    else {
      lightMode();
    }

    logseq.App.onThemeModeChanged((updated_theme) => {
      if (updated_theme.mode == "dark") {
        darkMode();
      }
      else {
        lightMode();
      }
    })
  });

  // shows plugin settings for user configuration
  settings_button.addEventListener("click", function () {
    logseq.showSettingsUI();
  });

  // expands the textarea dynamically
  add_task.addEventListener("input", function () {
    this.style.height = "";
    this.style.height = (this.scrollHeight - 4) + "px";
  });

  add_task.addEventListener("keydown", (e) => {
    // cmd enter to click add task button
    if (e.key == "Enter" && (e.metaKey)) {
      add_task.blur();
      start_button.click();
    }

    // auto-completes brackets
    else if (e.key == "[") {
      e.preventDefault();
      textFieldEdit.wrapSelection(add_task, "[", "]");
    }

    // auto-completes parentheses
    else if (e.key == "(") {
      e.preventDefault();
      textFieldEdit.wrapSelection(add_task, "(", ")");
    }
  });

  start_button.addEventListener("click", function () {
    if ((add_task.value != "") || (app.textContent != "")) {
      if (logseq.settings.Workflow) {
        block_content = `${workflow_format} ${add_task.value}`;
        app.textContent = block_content;
      }
      else {
        block_content = `${add_task.value}`;
        app.textContent = block_content;
      }

      // if a page is included in the task description, add the task to that page
      // ref: https://stackoverflow.com/questions/24040965/regular-expression-double-brackets-text
      let task_page = add_task.value.match(/(?:(^|[^\[])\[\[)([^\]]*?)(?:\]\](?:($|[^\]])))/);

      if ((task_page) && (logseq.settings.AddtoPage)) {
        // check if the page exists
        logseq.DB.datascriptQuery(`[
          :find (pull ?p [*])
          :where
            [?p :block/page ?h]
            [?h :block/original-name "${task_page[2]}"]
          ]`).then(page => {
            // if the page exists
            if (page[0]) {
              startTimerBasics();

              logseq.Editor.getPageBlocksTree(task_page[2]).then(page_blocks => {
                last_block_uuid = page_blocks[page_blocks.length-1].uuid;

                logseq.Editor.insertBlock(last_block_uuid, `${block_content}\ntime-tracked:: 00:00:00`, {
                  before: false,
                  sibling: true    
                });
              });
            }
            // if the page doesn't exist or if the page exists, but there are no blocks in the page
            else {
              logseq.App.showMsg(`${task_page[2]} doesn't exist`, "error");
            }
          });
      }
      // otherwise, add to the journal page
      else {
        // checks whether the task exists
        logseq.DB.datascriptQuery(`[
          :find (pull ?b [*])
          :where
            [?b :block/content ?content]
            [(clojure.string/includes? ?content "${block_content}")]
          ]`).then(task => {
          // if task doesn't exist
          if (task[0] == undefined) {
            startTimerBasics();

            logseq.Editor.getPageBlocksTree(todays_journal_title.toLowerCase()).then(todays_journal_blocks => {
              last_block_uuid = todays_journal_blocks[todays_journal_blocks.length-1].uuid;
              
              logseq.Editor.insertBlock(last_block_uuid, block_content, {
                before: false,
                sibling: true    
              });
            });
      
            setDriftlessTimeout(() => {
              logseq.Editor.getPageBlocksTree(todays_journal_title.toLowerCase()).then(todays_journal_blocks_updated => {
                created_block_uuid = todays_journal_blocks_updated[todays_journal_blocks_updated.length-1].uuid;
                logseq.Editor.upsertBlockProperty(created_block_uuid, "time-tracked", "00:00:00");
              });
            }, 25);
          }
          // if the task does exist
          else {
            startTimerBasics();
          }
        })
      }
    }
    else {
      // prevents timer from starting if there's no text added
      logseq.App.showMsg("No task added", "warning");
    }
  });

  stop_button.addEventListener("click", () => {
    stopTimerBasics();

    if (pomo_break == false) {
      // search for block based on its content to update its time-tracked property
      logseq.DB.datascriptQuery(`[
        :find (pull ?b [*])
        :where
          [?b :block/content ?content]
          [(clojure.string/includes? ?content "${block_content}")]
      ]`).then(result => {
          block_uuid = result[0][0].uuid.$uuid$;
          
          logseq.Editor.getBlockProperty(block_uuid, "time-tracked").then(time_tracked_property => {
            if (time_tracked_property == "00:00:00") {
              // updates the block w/ the log entry
              if (logseq.settings.Logs) {
                logseq.Editor.updateBlock(block_uuid, `${block_content}\n\n:LOG-ENTRIES:\nCLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration_tracked}\n:END:`);
              }

              setDriftlessTimeout(() => {
                // updates time-tracked property
                logseq.Editor.upsertBlockProperty(block_uuid, "time-tracked", `${duration_tracked}`);
              }, 25);
            }
            else {
              // 00:00:00
              h = parseInt(time_tracked_property.split(":")[0]) * 3600; // hour
              m = parseInt(time_tracked_property.split(":")[1]) * 60; // minute
              s = parseInt(time_tracked_property.split(":")[2]); // second
              addTimeTracked();

              // updates the block w/ the log entry
              if (logseq.settings.Logs) {
                // if the block content does contain ":LOG-ENTRIES:"
                if (result[0][0].content.includes(":LOG-ENTRIES:")) {
                  block_content = (result[0][0].content).split(":END:")[0];
                  logseq.Editor.updateBlock(block_uuid, `${block_content}CLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration_tracked}\n:END:`);
                }
                // if the block content doesn't contain ":LOG-ENTRIES:"
                else {
                  logseq.Editor.updateBlock(block_uuid, `${block_content}\n:LOG-ENTRIES:\nCLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration_tracked}\n:END:`);
                }
              }

              // updates the time-tracked property
              setDriftlessTimeout(() => {
                logseq.Editor.upsertBlockProperty(block_uuid, "time-tracked", `${hours}:${minutes}:${seconds}`);
              }, 25);
            }
          });
        });

      // removes stopwatch: duration (if displayed)
      logseq.provideUI ({
        key: "stopwatch-duration",
        path: "#toolbar-duration",
        template: `<div id="toolbar-duration" style="display:none;"></div>`
      });

      // removes pomodoro timer: duration (if displayed)
      logseq.provideUI ({
        key: "pomoTimer-duration",
        path: "#toolbar-duration",
        template: `<div id="toolbar-duration" style="display:none;"></div>`
      });
    }

    else if (pomo_break == true || (pause == true)) {
      // removes pomodoro timer: duration
      logseq.provideUI ({
        key: "pomoTimer-duration",
        path: "#toolbar-duration",
        template: `<div id="toolbar-duration" style="display:none;"></div>`
      });
    }
  });

  // use the escape key to hide the plugin UI
  document.addEventListener("keydown", function (e) {
    if (e.key == "Escape") {
      add_task.blur();
      logseq.hideMainUI();
    }
  });

  // clicking outside of the plugin UI hides it
  document.addEventListener("click", function (e) {
    if (!e.target.closest("div")) {
      add_task.blur();
      logseq.hideMainUI();
    }
  });

  logseq.provideModel({
    toggle() {
      logseq.toggleMainUI();
      add_task.focus();
    },
    stop() {
      stop_button.click();
    },
    refresh(e) {
      getTotalTimeTracked(e);
    },
    switch_to_pomo() {
      logseq.updateSettings({
        DefaultMode: "pomodoro timer"
      });
      setDriftlessTimeout(() => {
        timerMode();
      }, 25);
    },
    switch_to_stopwatch() {
      logseq.updateSettings({
        DefaultMode: "stopwatch"
      });
      setDriftlessTimeout(() => {
        timerMode();
      }, 25);
    }
  });

  logseq.setMainUIInlineStyle({
    position: "absolute",
    backgroundColor: "transparent",
    top: "2.5em",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "0.5em",
    width: "100vw",
    height: "100vh",
    overflow: "auto",
    zIndex: 100
  });
  
  function timerMode() {
    // toolbar item
    if (logseq.settings.DefaultMode == "stopwatch") {
      setDriftlessTimeout(() => {
        // toolbar: icon
        logseq.App.registerUIItem("toolbar", {
          key:"time-tracker-plugin",
          template: 
          `<a data-on-click="toggle" class="button" id="timer">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alarm" width="22" height="22" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <circle cx="12" cy="13" r="7" />
              <polyline points="12 10 12 13 14 13" />
              <line x1="7" y1="4" x2="4.25" y2="6" />
              <line x1="17" y1="4" x2="19.75" y2="6" />
            </svg>
          </a>`
        });

        // toolbar: mode (S for stopwatch)
        logseq.App.registerUIItem("toolbar", {
          key: "default-mode",
          template: 
          `<div id="timer-mode" style="float:left; margin-left:-0.125em;">
            <a data-on-click="switch_to_pomo" class="button">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-letter-s" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.25" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M17 8a4 4 0 0 0 -4 -4h-2a4 4 0 0 0 0 8h2a4 4 0 0 1 0 8h-2a4 4 0 0 1 -4 -4" />
              </svg>
            </a>
          </div>`
        });

        // toolbar: duration
        logseq.App.registerUIItem("toolbar", {
          key: "time-tracker-plugin-duration",
          template:
          `<div id="toolbar-duration"></div>`
        });
      }, 25);
    }
    else if (logseq.settings.DefaultMode == "pomodoro timer") {
      if (logseq.settings.DefaultMode == "pomodoro timer") {
        let pomo_duration_toolbar = logseq.settings.PomoDuration * 60;

        if (pomo_duration_toolbar <= 59) {
          pomo_min_duration = (pomo_duration_toolbar <= 9) ? `0${pomo_duration_toolbar}` : `${pomo_duration_toolbar}`
          // format the duration displayed in the toolbar
          duration = `00:${pomo_min_duration}:00`;
        }
        else {
          // pomodoro timer: hours_duration
          pomo_hr_duration = Math.floor(pomo_duration_toolbar/3600);
          pomo_hr_duration = (pomo_hr_duration.toString().length == 1) ? `0${pomo_hr_duration}`:`${pomo_hr_duration}`;
          // pomodoro timer: minutes_duration
          pomo_min_duration = Math.floor((pomo_duration_toolbar % 3600)/60);
          pomo_min_duration = (pomo_min_duration.toString().length == 1) ? `0${pomo_min_duration}`:`${pomo_min_duration}`;
          
          // format the duration displayed in the toolbar
          duration = `${pomo_hr_duration}:${pomo_min_duration}:00`;
        }
      }
    setDriftlessTimeout(() => {
      // toolbar: icon
      logseq.App.registerUIItem("toolbar", {
        key: "time-tracker-plugin",
        template: 
        `<div id="timer">
          <a class="button" data-on-click="toggle">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alarm" width="22" height="22" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <circle cx="12" cy="13" r="7" />
              <polyline points="12 10 12 13 14 13" />
              <line x1="7" y1="4" x2="4.25" y2="6" />
              <line x1="17" y1="4" x2="19.75" y2="6" />
            </svg>
          </a>
        </div>`
      });

        // toolbar: mode (P for pomodoro timer)
        logseq.App.registerUIItem("toolbar", {
          key: "default-mode",
          template: 
          `<div id="timer-mode" style="float:left; margin-left:-0.125em;">
            <a class="button" data-on-click="switch_to_stopwatch">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-letter-p" width="18" height="18" viewBox="0 0 24 24" stroke-width="2.5" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M7 20v-16h5.5a4 4 0 0 1 0 9h-5.5" />
              </svg>
            </a>
          </div>`
        });

        // toolbar: duration
        logseq.App.registerUIItem("toolbar", {
          key: "time-tracker-plugin-duration",
          template: `<div id="toolbar-duration"></div>`
        });
      }, 25);
    }
  }
  timerMode();

  // slash command - start
  logseq.Editor.registerSlashCommand("🟢 Start time tracking", async (e) => {
    startTimer(e);
  });

  // slash command - stop
  logseq.Editor.registerSlashCommand("🔴 Stop time tracking", async (e) => {
    stopTimer(e);
  });

  // slash command - get total time
  logseq.Editor.registerSlashCommand("🟡 Get/update total time tracked", async (e) => {
    getTotalTimeTracked(e);
  });

  // right click - start
  logseq.Editor.registerBlockContextMenuItem("🟢 Start time tracking", async (e) => {
      startTimer(e);
    });

  // right click - stop
  logseq.Editor.registerBlockContextMenuItem("🔴 Stop time tracking", async (e) => {
    stopTimer(e);
  });

  // right click - get total time
  logseq.Editor.registerBlockContextMenuItem("🟡 Get/update total time tracked", async (e) => {
    getTotalTimeTracked(e);
  });

  let keyboard_shortcut_version = 0;

  // register keyboard shortcuts
  function registerKeyboardShortcut(label, version, keyboard_shortcut) {
    // start/stop timer
    if (label == "KeyboardShortcut_Timer") {
      logseq.App.registerCommandPalette({
        key: `time-tracker-${label}-${version}`,
        label: "Start/stop timer",
        keybinding: {
          binding: keyboard_shortcut,
          mode: "global",
        }
      }, async () => {
        if (pause) {
          logseq.Editor.checkEditing().then(task_uuid => {
            if (task_uuid) {
              logseq.Editor.getBlock(task_uuid).then(task => {
                add_task.value = task.content;
                startTimer(task);
              });
              
              logseq.Editor.exitEditingMode();
            }
            else {
              logseq.App.showMsg("No task selected", "warning");
            }
          });
        }
        else {
          stop_button.click();
        }
      });
    }

    // get/update total time tracked
    else if (label == "KeyboardShortcut_getTotalTimeTracked") {
      logseq.App.registerCommandPalette({
        key: `time-tracker-${label}-${version}`,
        label: "Get/Update total time tracked",
        keybinding: {
          binding: keyboard_shortcut,
          mode: "global",
        }
      }, async (e) => {
        getTotalTimeTracked(e);
        logseq.Editor.exitEditingMode();
      });
    }
  }

  // unregister keyboard shortcut to tidy block(s)
  function unregisterKeyboardShortcut(label, version) {
    logseq.App.unregister_plugin_simple_command(`${logseq.baseInfo.id}/time-tracker-${label}-${version}`);
    
    version++;
  }

  logseq.onSettingsChanged(updated_settings => {
    // register keyboard shortcuts
    if (keyboard_shortcut_version == 0) {
      registerKeyboardShortcut("KeyboardShortcut_Timer", keyboard_shortcut_version, updated_settings.KeyboardShortcut_Timer);
      registerKeyboardShortcut("KeyboardShortcut_getTotalTimeTracked", keyboard_shortcut_version, updated_settings.KeyboardShortcut_getTotalTimeTracked);

      // keyboard_shortcut_version = 0 → 1;
      keyboard_shortcut_version++;
    }
    // when the keyboard shortcut is modified:
    else {      
      // keyboard_shortcut_version = 1 → 0;
      keyboard_shortcut_version--;

      // unregister previous shortcut
      unregisterKeyboardShortcut("KeyboardShortcut_Timer", keyboard_shortcut_version);
      unregisterKeyboardShortcut("KeyboardShortcut_getTotalTimeTracked", keyboard_shortcut_version);
    }
  });
}

logseq.ready(main).catch(console.error);