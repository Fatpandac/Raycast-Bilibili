import { runAppleScript } from "run-applescript";
import { checkLogin, getDynamicFeed } from "./utils";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

interface Preferences {
  justNotifyVideos: boolean
}

function notify(item: Bilibili.DynamicItem) {
  const preference: Preferences = getPreferenceValues()

  const doNotify = (title: string, subtitle: string) => {
    if (preference.justNotifyVideos && item.type !== "DYNAMIC_TYPE_AV") return;

    runAppleScript(`display notification "${subtitle}" with title "${title} - Bilibili"`);
  };

  switch (item.type) {
    case "DYNAMIC_TYPE_AV":
      doNotify(item.modules.module_author.name, item.modules.module_dynamic.major.archive.title);
      break;
    case "DYNAMIC_TYPE_FORWARD":
    case "DYNAMIC_TYPE_WORD":
    case "DYNAMIC_TYPE_DRAW":
      doNotify(item.modules.module_author.name, item.modules.module_dynamic.desc.text);
      break;
    case "DYNAMIC_TYPE_MUSIC":
      doNotify(item.modules.module_author.name, item.modules.module_dynamic.major.music.title);
      break;
    case "DYNAMIC_TYPE_LIVE_RCMD":
      // eslint-disable-next-line no-case-declarations
      const liveDate = JSON.parse(item.modules.module_dynamic.major.live_rcmd.content);

      doNotify(item.modules.module_author.name, liveDate.live_play_info.title);
      break;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function Command() {
  if (!checkLogin()) return;

  const items = await getDynamicFeed();
  const newNotifications = items.map((item) => item.id_str);
  const oldNotifications: string[] = JSON.parse((await LocalStorage.getItem("notifications")) || "[]");

  if (oldNotifications.length !== 0) {
    const startNotifyIndex = oldNotifications
      .map((oldNotifyId) => newNotifications.findIndex((newNotifyId) => newNotifyId === oldNotifyId))
      .filter((item) => item >= 0)[0];

    const unNotifies = newNotifications.slice(0, startNotifyIndex);
    for (const unNotify of unNotifies) {
      items.map((item) => {
        if (item.id_str === unNotify) {
          notify(item);
          sleep(500);
        }
      });
    }
  }

  await LocalStorage.setItem("notifications", JSON.stringify(newNotifications));
}
