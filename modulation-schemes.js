function sineWave(timeStamps, amp, freq) {
    return timeStamps.map((t) => amp * Math.sin(2*Math.PI*freq*t));
}

function cosineWave(timeStamps, amp, freq) {
    return timeStamps.map((t) => amp * Math.cos(2*Math.PI*freq*t));
}
