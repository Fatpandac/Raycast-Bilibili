import { LocalStorage } from "@raycast/api";
import { checkLogin, getDynamicFeed } from "./utils";
import { runAppleScript } from "run-applescript";

interface Notification {
  id: string;
  isNotified: boolean;
}

function notify(item: Bilibili.dynamicItem) {
  const doNotify = (title: string, subtitle: string) => {
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
  const newNotifications: Notification[] = items.map((item) => ({
    id: item.id_str,
    isNotified: false,
  }));
  const oldNotifications: Notification[] = JSON.parse((await LocalStorage.getItem("notifications")) || "[]");

  if (oldNotifications.length != 0) {
    const notifiedsId = oldNotifications.map((item) => item.id);
    const unNotifies = newNotifications.filter((item) => !notifiedsId.includes(item.id));

    if (!unNotifies.length) return;

    for (const unNotify of unNotifies) {
      items.map((item) => {
        if (item.id_str === unNotify.id) {
          notify(item);
          sleep(500);
        }
      });
    }

    const notifications = [
      ...unNotifies.map((item) => ({
        ...item,
        isNotified: true,
      })),
      ...oldNotifications,
    ];

    await LocalStorage.setItem("notifications", JSON.stringify(notifications.slice(0, 25)));
  } else {
    const notifications = newNotifications.map((item) => ({
      ...item,
      isNotified: true,
    }));

    await LocalStorage.setItem("notifications", JSON.stringify(notifications));
  }
}
