import { defineComponent, computed, h } from "vue";
import { useTTS } from "./useTTS";

export default defineComponent({
  name: "TTSButton",
  props: {
    content: { type: String, required: true },
    voiceId: { type: String, required: true },
    className: { type: String, default: "" },
    size: { type: Number, default: 24 },
  },
  setup(props) {
    const { status, play, stop } = useTTS(props.content, props.voiceId);

    const iconSize = computed(() => props.size);

    const buttonStyle = computed(() => ({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      transition: "opacity 0.2s",
    }));

    const ariaLabel = computed(() => {
      switch (status.value) {
        case "loading": return "Loading audio...";
        case "playing":
        case "fallback": return "Stop audio";
        case "paused": return "Resume audio";
        case "error": return "Audio error, click to retry";
        default: return "Play audio";
      }
    });

    function handleClick() {
      switch (status.value) {
        case "playing":
        case "fallback":
          stop();
          break;
        case "paused":
          play();
          break;
        case "loading":
          break;
        default:
          play();
          break;
      }
    }

    function renderIcon() {
      const s = iconSize.value;
      const svgBase = { width: s, height: s, viewBox: "0 0 24 24" };

      if (status.value === "idle") {
        return h("svg", { ...svgBase, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
          h("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
          h("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
          h("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" }),
        ]);
      }

      if (status.value === "loading") {
        return h("svg", { ...svgBase, fill: "none", stroke: "currentColor", "stroke-width": "2" }, [
          h("circle", { cx: "12", cy: "12", r: "10", opacity: "0.25" }),
          h("path", { d: "M12 2a10 10 0 0 1 10 10", opacity: "1" }, [
            h("animateTransform", { attributeName: "transform", type: "rotate", from: "0 12 12", to: "360 12 12", dur: "1s", repeatCount: "indefinite" }),
          ]),
        ]);
      }

      if (status.value === "playing" || status.value === "fallback") {
        return h("svg", { ...svgBase, fill: "currentColor" }, [
          h("rect", { x: "4", y: "10", width: "3", height: "4", rx: "1" }, [
            h("animate", { attributeName: "height", values: "4;14;4", dur: "0.8s", repeatCount: "indefinite" }),
            h("animate", { attributeName: "y", values: "10;5;10", dur: "0.8s", repeatCount: "indefinite" }),
          ]),
          h("rect", { x: "10", y: "8", width: "3", height: "8", rx: "1" }, [
            h("animate", { attributeName: "height", values: "8;4;8", dur: "0.8s", repeatCount: "indefinite", begin: "0.2s" }),
            h("animate", { attributeName: "y", values: "8;10;8", dur: "0.8s", repeatCount: "indefinite", begin: "0.2s" }),
          ]),
          h("rect", { x: "16", y: "6", width: "3", height: "12", rx: "1" }, [
            h("animate", { attributeName: "height", values: "12;6;12", dur: "0.8s", repeatCount: "indefinite", begin: "0.4s" }),
            h("animate", { attributeName: "y", values: "6;9;6", dur: "0.8s", repeatCount: "indefinite", begin: "0.4s" }),
          ]),
        ]);
      }

      if (status.value === "paused") {
        return h("svg", { ...svgBase, fill: "currentColor" }, [
          h("rect", { x: "6", y: "4", width: "4", height: "16", rx: "1" }),
          h("rect", { x: "14", y: "4", width: "4", height: "16", rx: "1" }),
        ]);
      }

      // Error state
      return h("svg", { ...svgBase, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
        h("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
        h("line", { x1: "23", y1: "9", x2: "17", y2: "15" }),
        h("line", { x1: "17", y1: "9", x2: "23", y2: "15" }),
      ]);
    }

    return () =>
      h("button", {
        type: "button",
        role: "button",
        class: props.className,
        style: buttonStyle.value,
        "aria-label": ariaLabel.value,
        disabled: status.value === "loading",
        title: ariaLabel.value,
        onClick: handleClick,
      }, [renderIcon()]);
  },
});
