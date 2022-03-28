import "@logseq/libs";
import {setDriftlessTimeout, setDriftlessInterval, clearDriftless} from "driftless";
import {format, getUnixTime} from "date-fns";
import * as textFieldEdit from 'text-field-edit';

let hr;
let min;
let sec;
let stopwatch;
let duration;
let pause;
let pomo_notif_active;
let pomo_notif;
let system_notif_active;
let system_notif;
let pomo_duration;

let todays_journal_title;
let workflow_format;
let block_uuid;
let last_block_uuid;
let created_block_uuid;
let block_content;
let start_time;
let current_time;
let time_elapsed;
let log_entry_start;
let log_entry_stop;
let refresh_uuid;

const app = document.getElementById("app");
const add_task = document.getElementById("add-task");
const start_button = document.getElementById("start-button");
const stop_button = document.getElementById("stop-button");
const settings_button = document.getElementById("settings-button");
const notif_sound = document.getElementById("pomo-notif");
const refresh_renderer = "{{renderer :refreshTotalTimeTracked}}";
const settings = [
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
    key: "NotifVolume",
    title: "Volume level of notification?",
    description: 'How loud would you like the "ding" sound to be?',
    default: "normal",
    enumPicker: "radio",
    enumChoices: ["quiet", "normal", "loud"],
    type: "enum"
  },
  {
    key: "refreshButtonColor",
    title: "Color of the refresh button",
    description: "This is the color of the refresh button (default: #F7BF18). ***You will need to reload the plugin after changing this setting",
    type: "string",
    default: "#F7BF18"
  },
  {
    key: "refreshButtonMarginTop",
    title: "Margin-top for the refresh button",
    description: "This is used to align the refresh button with text content in the blocks (default: -2.75em) - To move the button up, make the number more negative (e.g. -3.5em). To move the button down, make the number more positive (e.g. -1.5em). ***You will need to reload the plugin after changing this setting",
    type: "string",
    default: "-2.75em"
  }
]
logseq.useSettingsSchema(settings);

function getTotalTimeTracked(e) {
  let parent_time_entry = 0;
  let children_timeTracked_entry = 0;
  let children_timeTrackedTotal_entry = 0;
  let time_tracked_total = 0;
  let parent_block_content;

  if (e.uuid == undefined) {
    // gets the block uuid that the refresh button is located in
    e.uuid = e.dataset.refreshUuid;
  }

  logseq.Editor.getBlock(e.uuid, {includeChildren: true}).then(level1 => {
    parent_block_content = level1.content;

    // for blocks w/ children
    if (level1.children.length != 0) {
      logseq.Editor.getBlockProperty(e.uuid, "time-tracked").then(parent_timeTracked => {
        logseq.Editor.getBlockProperty(e.uuid, "time-tracked-total").then(parent_timeTrackedTotal => {
          // if the parent block has both the time-tracked-total and time-tracked properties
          if ((parent_timeTrackedTotal != null) && (parent_timeTracked != null)) {
            parent_time_entry = (parseInt(parent_timeTrackedTotal.split(":")[0])*3600) + (parseInt(parent_timeTrackedTotal.split(":")[1])*60) + parseInt(parent_timeTrackedTotal.split(":")[2]);
          }
          // if the parent block only has the time-tracked property
          else if ((parent_timeTrackedTotal == null) && (parent_timeTracked != null)) {
            parent_time_entry = (parseInt(parent_timeTracked.split(":")[0])*3600) + (parseInt(parent_timeTracked.split(":")[1])*60) + parseInt(parent_timeTracked.split(":")[2]);
          }
          // if the parent block only has the time-tracked-total property or if the parent block doesn't have either the time-tracked-total or time-tracked property
          else if ((parent_timeTrackedTotal != null) && (parent_timeTracked == null) || (parent_timeTrackedTotal == null) && (parent_timeTracked == null)) {
            parent_time_entry = 0;
          }
        });
      });

      for (const level2 of level1.children) {
        // level 2 blocks
        logseq.Editor.getBlockProperties(level2.uuid).then(level2_property => {
          // if the block only has the time-tracked-total property
          if (level2_property.timeTrackedTotal) {
            children_timeTrackedTotal_entry = (parseInt(level2_property.timeTrackedTotal.split(":")[0])*3600) + (parseInt(level2_property.timeTrackedTotal.split(":")[1])*60) + parseInt(level2_property.timeTrackedTotal.split(":")[2]);
          }
          // if the block only has the time-tracked property
          else if (level2_property.timeTracked) {
            children_timeTracked_entry += (parseInt(level2_property.timeTracked.split(":")[0])*3600) + (parseInt(level2_property.timeTracked.split(":")[1])*60) + parseInt(level2_property.timeTracked.split(":")[2]);
          }
          // if the block has both the time-tracked-total and time-tracked properties
          else if ((level2_property.timeTrackedTotal) && (level2_property.timeTracked)) {
            children_timeTracked_entry += 0;

            children_timeTrackedTotal_entry += (parseInt(level2_property.timeTrackedTotal.split(":")[0])*3600) + (parseInt(level2_property.timeTrackedTotal.split(":")[1])*60) + parseInt(level2_property.timeTrackedTotal.split(":")[2]);
          }
        });

        if (level2.children.length != 0) {
          // level 3 blocks
          for (const level3 of level2.children) {
            logseq.Editor.getBlockProperties(level3.uuid).then(level3_property => {
              // if the block only has the time-tracked-total property
              if (level3_property.timeTrackedTotal) {
                children_timeTrackedTotal_entry = (parseInt(level3_property.timeTrackedTotal.split(":")[0])*3600) + (parseInt(level3_property.timeTrackedTotal.split(":")[1])*60) + parseInt(level3_property.timeTrackedTotal.split(":")[2]);
              }
              // if the block only has the time-tracked property
              else if (level3_property.timeTracked) {
                children_timeTracked_entry += (parseInt(level3_property.timeTracked.split(":")[0])*3600) + (parseInt(level3_property.timeTracked.split(":")[1])*60) + parseInt(level3_property.timeTracked.split(":")[2]);
              }
              // if the block has both the time-tracked-total and time-tracked properties
              else if ((level3_property.timeTrackedTotal) && (level3_property.timeTracked)) {
                children_timeTracked_entry += 0;
    
                children_timeTrackedTotal_entry += (parseInt(level3_property.timeTrackedTotal.split(":")[0])*3600) + (parseInt(level3_property.timeTrackedTotal.split(":")[1])*60) + parseInt(level3_property.timeTrackedTotal.split(":")[2]);
              }
            });

            if (level3.children.length != 0) {
              // level 4 blocks
              for (const level4 of level3.children) {
                logseq.Editor.getBlockProperties(level4.uuid).then(level4_property => {
                  // if the block only has the time-tracked-total property
                  if (level4_property.timeTrackedTotal) {
                    children_timeTrackedTotal_entry = (parseInt(level4_property.timeTrackedTotal.split(":")[0])*3600) + (parseInt(level4_property.timeTrackedTotal.split(":")[1])*60) + parseInt(level4_property.timeTrackedTotal.split(":")[2]);
                  }
                  // if the block only has the time-tracked property
                  else if (level4_property.timeTracked) {
                    children_timeTracked_entry += (parseInt(level4_property.timeTracked.split(":")[0])*3600) + (parseInt(level4_property.timeTracked.split(":")[1])*60) + parseInt(level4_property.timeTracked.split(":")[2]);
                  }
                  // if the block has both the time-tracked-total and time-tracked properties
                  else if ((level4_property.timeTrackedTotal) && (level4_property.timeTracked)) {
                    children_timeTracked_entry += 0;
        
                    children_timeTrackedTotal_entry += (parseInt(level4_property.timeTrackedTotal.split(":")[0])*3600) + (parseInt(level4_property.timeTrackedTotal.split(":")[1])*60) + parseInt(level4_property.timeTrackedTotal.split(":")[2]);
                  }
                });

                if (level4.children.length != 0) {
                  // level 5 blocks
                  for (const level5 of level4.children) {
                    logseq.Editor.getBlockProperties(level5.uuid).then(level5_property => {
                      // if the block only has the time-tracked-total property
                      if (level5_property.timeTrackedTotal) {
                        children_timeTrackedTotal_entry = (parseInt(level5_property.timeTrackedTotal.split(":")[0])*3600) + (parseInt(level5_property.timeTrackedTotal.split(":")[1])*60) + parseInt(level5_property.timeTrackedTotal.split(":")[2]);
                      }
                      // if the block only has the time-tracked property
                      else if (level5_property.timeTracked) {
                        children_timeTracked_entry += (parseInt(level5_property.timeTracked.split(":")[0])*3600) + (parseInt(level5_property.timeTracked.split(":")[1])*60) + parseInt(level5_property.timeTracked.split(":")[2]);
                      }
                      // if the block has both the time-tracked-total and time-tracked properties
                      else if ((level5_property.timeTrackedTotal) && (level5_property.timeTracked)) {
                        children_timeTracked_entry += 0;
            
                        children_timeTrackedTotal_entry += (parseInt(level5_property.timeTrackedTotal.split(":")[0])*3600) + (parseInt(level5_property.timeTrackedTotal.split(":")[1])*60) + parseInt(level5_property.timeTrackedTotal.split(":")[2]);
                      }
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  setDriftlessTimeout(() => {
    // gets the uuid of the block that the refresh button is in
    refresh_uuid = e.uuid;

    // adds time tracked of the parent block and its child(ren) blocks to get total tracked time
    time_tracked_total = parent_time_entry + children_timeTracked_entry + children_timeTrackedTotal_entry;
    
    // convert total time tracked to 00:00:00
    let time_tracked_total_1 = (time_tracked_total/60).toFixed(4);
    let time_tracked_total_min_1 = time_tracked_total_1.split(".")[0];
    let time_tracked_total_sec_1 = ((parseInt(time_tracked_total_1.split(".")[1])*60)/10000).toFixed();

    let time_tracked_total_2 = (time_tracked_total/3600).toFixed(4);
    let time_tracked_total_hour_1 = time_tracked_total_2.split(".")[0];
    let update_to_time_tracked_total_minutes_1 = ((parseInt(time_tracked_total_2.split(".")[1])*60)/10000).toFixed(4);
    let time_tracked_total_min_2 = update_to_time_tracked_total_minutes_1.split(".")[0];
    let time_tracked_total_sec_2 = ((parseInt(update_to_time_tracked_total_minutes_1.toString().split(".")[1])*60)/10000).toFixed();

    // convert total time tracked to 00:00:00:00
    let day; 
    let time_tracked_total_3 = (time_tracked_total/86400).toFixed(5);
    let time_tracked_total_day = time_tracked_total_3.split(".")[0];
    let updated_to_time_tracked_total_hours = ((parseInt(time_tracked_total_3.split(".")[1])*24)/100000).toFixed(5);
    let time_tracked_total_hour_2 = updated_to_time_tracked_total_hours.split(".")[0];
    let update_to_time_tracked_total_minutes_2 = ((parseInt(updated_to_time_tracked_total_hours.split(".")[1])*60)/100000).toFixed(5);
    let time_tracked_total_min_3 = update_to_time_tracked_total_minutes_2.split(".")[0];
    let time_tracked_total_sec_3 = ((parseInt(update_to_time_tracked_total_minutes_2.split(".")[1])*60)/100000).toFixed();

    // 00:00:seconds
    if (time_tracked_total <= 59) {
      if ((time_tracked_total.toString().length == 1)) {
        sec = `0${time_tracked_total}`;
      }
      else  {
        sec = `${time_tracked_total}`;
      }
      logseq.Editor.getBlockProperty(e.uuid, "time-tracked-total").then(a => {
        // if the block does NOT have the time-tracked-total property
        if (a == null) {
          logseq.Editor.updateBlock(e.uuid, `${parent_block_content}\ntime-tracked-total:: 00:00:${sec} ${refresh_renderer}`);
        }
        // if the block does have the time-tracked-total property
        else {
          logseq.Editor.upsertBlockProperty(e.uuid, "time-tracked-total", `00:00:${sec} {{renderer ${refresh_renderer}`);
        }
      });
    }

    // 00:minutes:seconds
    else if ((time_tracked_total >= 60) && (time_tracked_total <= 3599)) {
      // minutes
      if (time_tracked_total_min_1.length == 1) {
        min = `0${time_tracked_total_min_1}`;
      }
      else {
        min = time_tracked_total_min_1;
      }

      // seconds
      if (time_tracked_total_sec_1.length == 1) {
        sec = `0${time_tracked_total_sec_1}`;
      }
      else {
        sec = time_tracked_total_sec_1;
      }
      logseq.Editor.getBlockProperty(e.uuid, "time-tracked-total").then(b => {
        // if the block does NOT have the time-tracked-total property
        if (b == null) {
          logseq.Editor.updateBlock(e.uuid, `${parent_block_content}\ntime-tracked-total:: 00:${min}:${sec} ${refresh_renderer}`);
        }
        // if the block does have the time-tracked-total property
        else {
          logseq.Editor.upsertBlockProperty(e.uuid, "time-tracked-total", `00:${min}:${sec} {{renderer ${refresh_renderer}`);
        }
      });
    }
    // hours:minutes:seconds
    else if ((time_tracked_total >= 3600) && (time_tracked_total <= 86399)) {
      // hours
      if (time_tracked_total_hour_1.length == 1) {
        hr =`0${time_tracked_total_hour_1}`;
      }
      else {
        hr = time_tracked_total_hour_1;
      }

      // minutes
      if (time_tracked_total_min_2.length == 1) {
        min = `0${time_tracked_total_min_2}`;
      }
      else {
        min = time_tracked_total_min_2;
      }

      // seconds 
      if (time_tracked_total_sec_2.length == 1) {
        sec =`0${time_tracked_total_sec_2}`;
      }

      else if (time_tracked_total_sec_2 == "60") {
        sec = "00";

        if (time_tracked_total_min_2.length == 1) {
          min = "0" + (parseInt(time_tracked_total_min_2) + 1).toString();
        }
        else {
          min = (parseInt(time_tracked_total_min_2) + 1).toString();
        }
      }

      else {
        sec = time_tracked_total_sec_2;
      }
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
      if (time_tracked_total_day.length == 1) {
        day = `0${time_tracked_total_day}`;
      }
      else {
        day = time_tracked_total_day;
      }

      // hours
      if (time_tracked_total_hour_2.length == 1) {
        hr =`0${time_tracked_total_hour_2}`;
      }
      else {
        hr = time_tracked_total_hour_2;
      }

      // minutes
      if (time_tracked_total_min_3.length == 1) {
        min = `0${time_tracked_total_min_3}`;
      }
      else {
        min = time_tracked_total_min_3;
      }

      // seconds 
      if (time_tracked_total_sec_3.length == 1) {
        sec =`0${time_tracked_total_sec_3}`;
      }

      else if (time_tracked_total_sec_3 == "60") {
        sec = "00";

        if (time_tracked_total_sec_3.length == 1) {
          min = "0" + (parseInt(time_tracked_total_min_3) + 1).toString();
        }
        else {
          min = (parseInt(time_tracked_total_min_3) + 1).toString();
        }
      }

      else {
        sec = time_tracked_total_sec_3;
      }
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
  }, 75);
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
  stopwatch = setDriftlessInterval(() => updateStopwatch(), 1000);
  logseq.hideMainUI();
  logseq.App.showMsg("Timer started");
  app.style.display = "block";
  add_task.style.display = "none";
  stop_button.style.display = "block";
  start_button.style.display = "none";
  log_entry_start = format(new Date(), "yyyy-MM-dd EEE HH:mm:ss");

  if (pomo_notif_active && system_notif_active) {
    notifSoundVolume();
    pomo_notif = setDriftlessInterval(() => notif_sound.play(), (pomo_duration * 60000));
    system_notif = setDriftlessInterval(() => new Notification(`${duration} has passed`), (pomo_duration * 60000));
  }
  else if (pomo_notif_active && !system_notif_active) {
    notifSoundVolume();
    pomo_notif = setDriftlessInterval(() => notif_sound.play(), (pomo_duration * 60000));
  }
  else if (!pomo_notif_active && system_notif_active) {
    system_notif = setDriftlessInterval(() => new Notification(`${duration} has passed`), (pomo_duration * 60000));
  }
}

function stopTimerBasics() {
  pause = true;
  clearDriftless(stopwatch);
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
}

function startTimer(e) {
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
          block_content = `${block_content}\n\n:LOG-ENTRIES:\nCLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration}\n:END:`;
          logseq.Editor.updateBlock(thisBlock.uuid, block_content);
        }

        setDriftlessTimeout(() => {
          // updates time-tracked property
          logseq.Editor.upsertBlockProperty(thisBlock.uuid, "time-tracked", `${duration}`);
        }, 25);
      }
      // existing task w/ previously tracked time
      else {
        // 00:00:00
        let h = parseInt(time.split(":")[0]) * 3600; // hour
        let m = parseInt(time.split(":")[1]) * 60; // minute
        let s = parseInt(time.split(":")[2]); // second

        let previous_time_tracked = h + m + s;
        let total_time_tracked_sec = previous_time_tracked + time_elapsed;

        let hr_raw = (total_time_tracked_sec/3600).toFixed(4);
        let hours = hr_raw.split(".")[0];
        let min_raw = ((parseInt(hr_raw.split(".")[1])*60)/10000).toFixed(4);
        let minutes = min_raw.split(".")[0];
        let seconds = ((parseInt(min_raw.toString().split(".")[1])*60)/10000).toFixed();

        // hours
        if (hours.length == 1) {
          hours = `0${hours}`;
        }
        else {
          hours = hours;
        }

        // minutes
        if (minutes.length == 1) {
          minutes = `0${minutes}`;
        }
        else {
          minutes = minutes;
        }

        // seconds
        if (seconds.length == 1) {
          seconds = `0${seconds}`;
        }
        else {
          seconds = seconds;
        }

        // updates the block w/ the log entry
        if (logseq.settings.Logs) {
          // if the block content contains ":LOG-ENTRIES:"
          if (thisBlock.content.includes(":LOG-ENTRIES:")) {
            block_content = (thisBlock.content).split(":END:")[0];
            logseq.Editor.updateBlock(thisBlock.uuid, `${block_content}CLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration}\n:END:`); 
          }
          // if the block content doesn't contain ":LOG-ENTRIES:"
          else {
            logseq.Editor.updateBlock(thisBlock.uuid, `${block_content}\n:LOG-ENTRIES:\nCLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration}\n:END:`);
          }
        }

        // updates the time-tracked property
        setDriftlessTimeout(() => {
          logseq.Editor.upsertBlockProperty(thisBlock.uuid, "time-tracked", `${hours}:${minutes}:${seconds}`);
        }, 25);
      }
    });
  });

  // removes stopwatch
  logseq.provideUI ({
    key: "stopwatch",
    path: "#timer",
    template: `<div id="stopwatch" style="display:none;"></div>`
  });
}

function updateStopwatch() {
  current_time = getUnixTime(new Date());
  time_elapsed = current_time - start_time;
  let time_elapsed_1 = (time_elapsed/60).toFixed(4);
  let updated_min_1 = time_elapsed_1.split(".")[0];
  let updated_sec_1 = ((parseInt(time_elapsed_1.split(".")[1])*60)/10000).toFixed();
  let time_elapsed_2 = (time_elapsed/3600).toFixed(4);
  let updated_hour = time_elapsed_2.split(".")[0];
  let update_to_minutes = ((parseInt(time_elapsed_2.split(".")[1])*60)/10000).toFixed(4);
  let updated_min_2 = update_to_minutes.split(".")[0];
  let updated_sec_2 = ((parseInt(update_to_minutes.toString().split(".")[1])*60)/10000).toFixed();

  if ((Number.isInteger(start_time)) && (pause == false)) {
    // 00:00:seconds
    if (time_elapsed <= 59) {
      if ((time_elapsed.toString().length == 1)) {
        sec = `0${time_elapsed}`;
      }
      else  {
        sec = `${time_elapsed}`;
      }
      duration = `00:00:${sec}`;
    }

    // 00:minutes:seconds
    else if ((time_elapsed >= 60) && (time_elapsed <= 3599)) {
      // minutes
      if (updated_min_1.length == 1) {
        min = `0${updated_min_1}`;
      }
      else {
        min = updated_min_1;
      }

      // seconds
      if (updated_sec_1.length == 1) {
        sec = `0${updated_sec_1}`;
      }
      else {
        sec = updated_sec_1;
      }
      duration = `00:${min}:${sec}`;
    }

    // hours:minutes:seconds
    else if ((time_elapsed >= 3600) && (time_elapsed <= 86,399)) {
      // hours
      if (updated_hour.length == 1) {
        hr =`0${updated_hour}`;
      }
      else {
        hr = updated_hour;
      }

      // minutes
      if (updated_min_2.length == 1) {
        min = `0${updated_min_2}`;
      }
      else {
        min = updated_min_2;
      }

      // seconds 
      if (updated_sec_2.length == 1) {
        sec =`0${updated_sec_2}`;
      }

      else if (updated_sec_2 == "60") {
        sec = "00";

        if (updated_min_2.length == 1) {
          min = "0" + (parseInt(updated_min_2) + 1).toString();
        }
        else {
          min = (parseInt(updated_min_2) + 1).toString();
        }
      }

      else {
        sec = updated_sec_2;
      }
      duration = `${hr}:${min}:${sec}`;
    }

    // if timer is running for 24 hours
    else {
      duration = "ERROR (24 hr limit)";
    }
  }

  // inserts stopwatch duration next to toolbar icon
  logseq.provideUI ({
    key: "stopwatch",
    path: "#timer",
    template: `<div id="stopwatch" data-on-click="stop" style="font-size:0.3em; padding-left:0.3em; font-weight:600; font-family:Lucida Console, Consolas, monospace">${duration}</div>`
  });
}

const main = async () => {
  console.log("logseq-time-tracker-plugin loaded");

  // renderer for refresh button
  logseq.App.onMacroRendererSlotted(async ({slot, payload}) => {
    const refresh_button_color = logseq.settings.refreshButtonColor;
    const refresh_button_margin_top = logseq.settings.refreshButtonMarginTop;
    let [type] = payload.arguments;

    if (type.startsWith(":refreshTotalTimeTracked")) {
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
          margin-top: ${refresh_button_margin_top};
        }
      `)

      logseq.provideUI({
        key: 'refresh',
        slot, 
        reset: true,
        template: `
          <a data-on-click="refresh" class="button refresh" data-refresh-uuid="${refresh_uuid}">
            <svg id="icon" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-refresh" width="22" height="22" viewBox="0 0 24 24" stroke-width="2" stroke="${refresh_button_color}" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
          </a>
        `,
      });
    }
  });

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
    if (add_task.value != "") {
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
      logseq.App.showMsg("No task added", "error");
    }
  });

  stop_button.addEventListener("click", () => {
    stopTimerBasics();

    // search for block based on its content to update its time-tracked property
    logseq.DB.datascriptQuery(`[
      :find (pull ?b [*])
      :where
        [?b :block/content ?content]
        [(clojure.string/includes? ?content "${block_content}")]
    ]`).then(result => {
        block_uuid = result[0][0].uuid.$uuid$;
        
        logseq.Editor.getBlockProperty(block_uuid, "time-tracked").then(updated_time => {
          if (updated_time == "00:00:00") {
            // updates the block w/ the log entry
            if (logseq.settings.Logs) {
              logseq.Editor.updateBlock(block_uuid, `${block_content}\n\n:LOG-ENTRIES:\nCLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration}\n:END:`);
            }

            setDriftlessTimeout(() => {
              // updates time-tracked property
              logseq.Editor.upsertBlockProperty(block_uuid, "time-tracked", `${duration}`);
            }, 25);
          }
          else {
            // 00:00:00
            let h = parseInt(updated_time.split(":")[0]) * 3600; // hour
            let m = parseInt(updated_time.split(":")[1]) * 60; // minute
            let s = parseInt(updated_time.split(":")[2]); // second

            let previous_time_tracked = h + m + s;
            let total_time_tracked_sec = previous_time_tracked + time_elapsed;

            let hr_raw = (total_time_tracked_sec/3600).toFixed(4);
            let hours = hr_raw.split(".")[0];
            let min_raw = ((parseInt(hr_raw.split(".")[1])*60)/10000).toFixed(4);
            let minutes = min_raw.split(".")[0];
            let seconds = ((parseInt(min_raw.toString().split(".")[1])*60)/10000).toFixed();

            // hours
            if (hours.length == 1) {
              hours = `0${hours}`;
            }
            else {
              hours = hours;
            }

            // minutes
            if (minutes.length == 1) {
              minutes = `0${minutes}`;
            }
            else {
              minutes = minutes;
            }

            // seconds
            if (seconds.length == 1) {
              seconds = `0${seconds}`;
            }
            else {
              seconds = seconds;
            }

            // updates the block w/ the log entry
            if (logseq.settings.Logs) {
              // if the block content does contain ":LOG-ENTRIES:"
              if (result[0][0].content.includes(":LOG-ENTRIES:")) {
                block_content = (result[0][0].content).split(":END:")[0];
                logseq.Editor.updateBlock(block_uuid, `${block_content}CLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration}\n:END:`);
              }
              // if the block content doesn't contain ":LOG-ENTRIES:"
              else {
                logseq.Editor.updateBlock(block_uuid, `${block_content}\n:LOG-ENTRIES:\nCLOCK: [${log_entry_start}]--[${log_entry_stop}] => ${duration}\n:END:`);
              }
            }

            // updates the time-tracked property
            setDriftlessTimeout(() => {
              logseq.Editor.upsertBlockProperty(block_uuid, "time-tracked", `${hours}:${minutes}:${seconds}`);
            }, 25);
          }
        });
      });

    // removes stopwatch
    logseq.provideUI ({
      key: "stopwatch",
      path: "#timer",
      template: `<div id="stopwatch" style="display:none;"></div>`
    });
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

  logseq.provideModel ({
    toggle() {
      logseq.toggleMainUI();
      add_task.focus();
    },
    stop() {
      stop_button.click();
    },
    refresh(e) {
      getTotalTimeTracked(e);
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
  
  // toolbar item
  logseq.App.registerUIItem("toolbar", {
    key: "time-tracking-plugin-open",
    template: 
      `<a data-on-click="toggle" id="timer" class="button" style="margin-top:0.05em">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alarm" width="22" height="22" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <circle cx="12" cy="13" r="7" />
          <polyline points="12 10 12 13 14 13" />
          <line x1="7" y1="4" x2="4.25" y2="6" />
          <line x1="17" y1="4" x2="19.75" y2="6" />
        </svg>
      </a>`
  });

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
}

logseq.ready(main).catch(console.error);