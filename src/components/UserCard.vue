<template>
    <Popover>
        <PopoverTrigger class="font-mono pointer-events-auto">
            <Button class="m-0 cursor-pointer p-0" variant="link">@mbabb</Button>
        </PopoverTrigger>
        <PopoverContent class="pointer-events-auto z-[100]">
            <div class="flex gap-4 p-4">
                <Avatar>
                    <AvatarImage
                        src="https://avatars.githubusercontent.com/u/2848617?v=4"
                    />
                </Avatar>
                <div>
                    <h4 class="text-lg hover:underline">
                        <a href="https://github.com/mkbabb">@mbabb</a>
                    </h4>
                    <p>
                        Check out the project on
                        <a
                            class="hover:underline"
                            href="https://github.com/TheFridayInstitute/speedtest"
                            >GitHub</a
                        >
                    </p>
                </div>
            </div>
            <hr class="my-2 border-border" />
            <div class="flex items-center justify-between px-4 py-2">
                <span class="text-lg text-muted-foreground">Dark mode</span>
                <DarkModeToggle
                    class="aspect-square w-6 cursor-pointer hover:scale-105 hover:opacity-50"
                />
            </div>
        </PopoverContent>
    </Popover>
</template>

<script setup lang="ts">
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@components/ui/popover";
import { DarkModeToggle } from "@components/custom/dark-mode-toggle";
import { Avatar, AvatarImage } from "@components/ui/avatar";
import { Button } from "@components/ui/button";
</script>
