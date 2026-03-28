(function() {
    // Create SVG namespace
    const svgNS = "http://www.w3.org/2000/svg";
    
    // Create hidden SVG container
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("style", "position: absolute; width: 0; height: 0; left: -9999px; top: -9999px; overflow: hidden; pointer-events: none;");
    
    // Create Filter
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "liquid-glass-filter");
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-20%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "140%");
    filter.setAttribute("filterUnits", "objectBoundingBox");
    filter.setAttribute("primitiveUnits", "userSpaceOnUse");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    // 1. Turbulence for noise
    const feTurbulence = document.createElementNS(svgNS, "feTurbulence");
    feTurbulence.setAttribute("type", "fractalNoise");
    feTurbulence.setAttribute("baseFrequency", "0.02 0.04"); // Adjust for texture size
    feTurbulence.setAttribute("numOctaves", "3");
    feTurbulence.setAttribute("seed", "5");
    feTurbulence.setAttribute("result", "liquidTexture");
    
    // 2. Displacement Map
    const feDisplacementMap = document.createElementNS(svgNS, "feDisplacementMap");
    feDisplacementMap.setAttribute("in", "SourceGraphic"); 
    feDisplacementMap.setAttribute("in2", "liquidTexture");
    feDisplacementMap.setAttribute("scale", "15"); // Distortion strength
    feDisplacementMap.setAttribute("xChannelSelector", "R");
    feDisplacementMap.setAttribute("yChannelSelector", "G");
    feDisplacementMap.setAttribute("result", "distorted");

    // Append primitives to filter
    filter.appendChild(feTurbulence);
    filter.appendChild(feDisplacementMap);
    
    // Append filter to SVG
    svg.appendChild(filter);
    
    // Append SVG to body when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(svg));
    } else {
        document.body.appendChild(svg);
    }

    console.log("Liquid Glass SVG filter injected.");
})();
