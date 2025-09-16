"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { NavigationItem } from "./navigation";

interface CommandMenuProps {
  items: NavigationItem[];
}

export function CommandMenu({ items }: CommandMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(prev => !prev);
      }
    };

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const navItems = React.useMemo(() => {
    const map = new Map<string, NavigationItem>();
    for (const item of items) {
      if (!map.has(item.href)) {
        map.set(item.href, item);
      }
    }
    return Array.from(map.values());
  }, [items]);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden items-center gap-2 rounded-lg border-input/80 bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-none transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:flex"
        onClick={() => setOpen(true)}
        aria-label="Apri la ricerca rapida"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="whitespace-nowrap">Cerca</span>
        <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Apri la ricerca rapida"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 shadow-xl sm:max-w-lg">
          <Command className="bg-popover text-popover-foreground">
            <CommandInput placeholder="Cerca viste o azioni..." />
            <CommandList>
              <CommandEmpty>Nessun risultato</CommandEmpty>
              <CommandGroup heading="Navigazione">
                {navItems.map(item => (
                  <CommandItem
                    key={item.href}
                    value={`${item.name} ${item.description ?? ""}`.toLowerCase()}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-3"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      {item.description ? (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
