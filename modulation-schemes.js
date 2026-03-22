function sineWave(timeStamps, amp, freq) {
    return timeStamps.map((t) => amp * Math.sin(2*Math.PI*freq*t));
}

function cosineWave(timeStamps, amp, freq) {
    return timeStamps.map((t) => amp * Math.cos(2*Math.PI*freq*t));
}

function modulateDsbAm(msgSamples, carrSamples, ampCarr) {
    const shiftedMsgSamples = msgSamples.map((v) => Math.max(0, 1 + v / ampCarr));
    return shiftedMsgSamples.map((msg, idx) => msg * carrSamples[idx]);
}

function modulateDsbScAm(msgSamples, carrSamples, ampCarr) {
    return msgSamples.map((sample, idx) => sample * carrSamples[idx] / ampCarr);
}

function modulateSsbScAm(msgSamples, carrSamples, ampCarr) {
	const hilbertMsg = fourier.hilbert(msgSamples).hilbertImag;
	const hilbertCarr = fourier.hilbert(carrSamples).hilbertImag
    return msgSamples.map((sample, idx) => (sample * carrSamples[idx] - hilbertMsg[idx] * hilbertCarr[idx]) / (2*ampCarr));
}

function amplitudeModulation(samples, ampCarr, freqCarr, samplerate) {
    const timeStamps = samples.map((_, idx) => idx / samplerate);
    const carrSamples = cosineWave(timeStamps, ampCarr, freqCarr);
    return modulateDsbScAm(samples, carrSamples, ampCarr);
}

function dsbScModulation(samples, ampCarr, freqCarr, samplerate) {
	const timeStamps = samples.map((_, idx) => idx / samplerate);
    const carrSamples = cosineWave(timeStamps, ampCarr, freqCarr);
    return modulateDsbScAm(samples, carrSamples)
}

function amplitudeDemodulation(samples, ampCarr) {
	const envSamples = fourier.envelope(samples);
    return envSamples.map((t) => t - ampCarr);
}
