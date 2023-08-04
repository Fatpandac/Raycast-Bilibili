import { runAppleScript } from "run-applescript";
import { checkLogin, formatUrl, getDynamicFeed } from "./utils";
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { spawnSync } from 'child_process';

interface Preferences {
  justNotifyVideos: boolean
  terminalNotifierPath: string
}

function notify(item: Bilibili.DynamicItem) {
  const preference: Preferences = getPreferenceValues()

  const doNotify = async (title: string, subtitle: string, link: string) => {
    if (preference.justNotifyVideos && item.type !== "DYNAMIC_TYPE_AV") return;
    if (!preference.terminalNotifierPath) {
      runAppleScript(`display notification "${subtitle}" with title "${title} - Bilibili"`);
      return;
    }

    const { status } = spawnSync(preference.terminalNotifierPath, ["-title", `${title} - Bilibili`, "-subtitle", subtitle, "-open", link])
    if (status) {
      runAppleScript(`display notification "${subtitle}" with title "${title} - Bilibili"`);
    }
  };

  switch (item.type) {
    case "DYNAMIC_TYPE_AV":
      doNotify(item.modules.module_author.name, item.modules.module_dynamic.major.archive.title, item.modules.module_dynamic.major.archive.jump_url);
      break;
    case "DYNAMIC_TYPE_FORWARD":
    case "DYNAMIC_TYPE_WORD":
    case "DYNAMIC_TYPE_DRAW":
      doNotify(item.modules.module_author.name, item.modules.module_dynamic.desc.text, `https://www.bilibili.com/opus/${item.id_str}`);
      break;
    case "DYNAMIC_TYPE_MUSIC":
      doNotify(item.modules.module_author.name, item.modules.module_dynamic.major.music.title, formatUrl(item.modules.module_dynamic.major.music.jump_url));
      break;
    case "DYNAMIC_TYPE_LIVE_RCMD":
      // eslint-disable-next-line no-case-declarations
      const liveDate = JSON.parse(item.modules.module_dynamic.major.live_rcmd.content);

      doNotify(item.modules.module_author.name, liveDate.live_play_info.title, formatUrl(liveDate.live_play_info.link));
      break;
  }
}

export default async function Command() {
  if (!checkLogin()) return;

  console.log('running')
  const items = await getDynamicFeed();
  const newNotifications = items.map((item) => item.id_str);
  const oldNotifications: string[] = JSON.parse((await LocalStorage.getItem("notifications")) || "[]");

  if (oldNotifications.length !== 0) {
    const startNotifyIndex = oldNotifications
      .map((oldNotifyId) => newNotifications.findIndex((newNotifyId) => newNotifyId === oldNotifyId))
      .filter((item) => item >= 0)[0];

    const unNotifies = newNotifications.slice(0, startNotifyIndex);
    console.log(unNotifies)
    for (const unNotify of unNotifies) {
      console.log(unNotify)
      items.map((item) => {
        if (item.id_str === unNotify) {
          console.log('sdf')
          notify(item);
        }
      });
    }
  }

  await LocalStorage.setItem("notifications", JSON.stringify(newNotifications));
}
