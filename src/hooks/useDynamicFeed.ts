import { getDynamicFeed, getPlayUrl, getVideoInfo } from "../utils";

import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";

export function useDynamicFeed() {
  const [dynamicItems, setDynamicItems] = useState<Bilibili.DynamicItems>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRefetch, refetch] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await getDynamicFeed();

        const dynamicList = await Promise.all(
          res.map(async (item: Bilibili.DynamicItem) => {
            if (item.type !== "DYNAMIC_TYPE_AV") return item;

            const videoInfo = await getVideoInfo(item.modules.module_dynamic.major.archive.aid);
            const videoPlayUrl = await getPlayUrl(videoInfo.bvid, videoInfo.cid.toString());

            item.modules.module_dynamic.major.archive.last_play_time = videoPlayUrl.last_play_time;

            return item;
          })
        );

        setDynamicItems(dynamicList);
        setIsLoading(false);
      } catch (error) {
        console.log(error);
        showToast(Toast.Style.Failure, "Get dynamic video feed failed");
      }
    })();
  }, [shouldRefetch]);

  return { dynamicItems, isLoading, refetch };
}
