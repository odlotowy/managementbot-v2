const GROUP_ID = 701477590;

export interface RobloxUserData {
  exists: boolean;
  id: number | null;
  username: string | null;
  displayName: string | null;
  avatar: string | null;

  group: {
    inGroup: boolean;
    rankId: number | null;
    rankName: string | null;
  };
}

export async function getRobloxUser(username: string): Promise<RobloxUserData> {
  const notFound: RobloxUserData = {
    exists: false,
    id: null,
    username: null,
    displayName: null,
    avatar: null,
    group: {
      inGroup: false,
      rankId: null,
      rankName: null,
    },
  };

  try {
    // Find user by username
    const userResponse = await fetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false,
        }),
      },
    );

    if (!userResponse.ok) {
      throw new Error(`Roblox user API returned ${userResponse.status}`);
    }

    const userData = await userResponse.json();

    if (!userData.data || userData.data.length === 0) {
      return notFound;
    }

    const user = userData.data[0];

    // Get full user information
    const detailsResponse = await fetch(
      `https://users.roblox.com/v1/users/${user.id}`,
    );

    if (!detailsResponse.ok) {
      throw new Error(`Roblox details API returned ${detailsResponse.status}`);
    }

    // Get group rank
    const groupResponse = await fetch(
      `https://groups.roblox.com/v2/users/${user.id}/groups/roles`,
    );

    let rankId: number | null = null;
    let rankName: string | null = null;
    let inGroup = false;

    if (groupResponse.ok) {
      const groupData = await groupResponse.json();

      const group = groupData.data?.find(
        (entry: any) => entry.group?.id === GROUP_ID,
      );

      if (group) {
        inGroup = true;
        rankId = group.role?.rank ?? null;
        rankName = group.role?.name ?? null;
      }
    }

    // Get avatar
    const avatarResponse = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png&isCircular=false`,
    );

    let avatar: string | null = null;

    if (avatarResponse.ok) {
      const avatarData = await avatarResponse.json();
      avatar = avatarData.data?.[0]?.imageUrl ?? null;
    }

    return {
      exists: true,
      id: user.id,
      username: user.name,
      displayName: user.displayName,
      avatar,

      group: {
        inGroup,
        rankId,
        rankName,
      },
    };
  } catch (error) {
    console.error("[Roblox] Failed to fetch user:", error);

    return notFound;
  }
}
