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

function cumSum(values) {
    return values.map((sum => value => sum += value)(0));
}

function frequencyModulation(samples, freqMsg, modIdx, ampCarr, freqCarr, samplerate) {
    const cumSamples = cumSum(samples);
    return cumSamples.map((cumSample, idx) => ampCarr * Math.cos((2*Math.PI*freqCarr*idx + modIdx * 2*Math.PI*freqMsg*cumSample) / samplerate));
}

function phaseModulation(samples, modIdx, ampCarr, freqCarr, samplerate) {
    return samples.map((sample, idx) => ampCarr * Math.cos(2*Math.PI*freqCarr*idx/samplerate + modIdx * sample));
}

function bitStreamToSamples(bitStream, samplesPerBit) {
	return [].concat(...bitStream.map((el) => Array(samplesPerBit).fill(el)));
}

function modulateAsk(msgSamples, carrSamples) {
	return msgSamples.map((bit, idx) => bit != 0 ? carrSamples[idx] : 0);
}

function askModulation(bitStream, samplesPerBit, ampCarr, freqCarr, sampleRate) {
	const samples = bitStreamToSamples(bitStream, samplesPerBit);
    const timeStamps = samples.map((_, idx) => idx/sampleRate);
    const carrSamples = cosineWave(timeStamps, ampCarr, freqCarr);
	return modulateAsk(samples, carrSamples);
}

function modulateFsk(msgSamples, lowCarrSamples, highCarrSamples) {
	return msgSamples.map((bit, idx) => bit != 0 ? highCarrSamples[idx] : lowCarrSamples[idx]);
}

function fskModulation(bitStream, samplesPerBit, ampCarr, freqCarrLow, freqCarrHigh, sampleRate) {
	const samples = bitStreamToSamples(bitStream, samplesPerBit);
    const timeStamps = samples.map((_, idx) => idx/sampleRate);
    const lowCarrSamples = cosineWave(timeStamps, ampCarr, freqCarrLow);
    const highCarrSamples = cosineWave(timeStamps, ampCarr, freqCarrHigh);
	return modulateFsk(samples, lowCarrSamples, highCarrSamples);
}

function modulateBpsk(msgSamples, carrSamples) {
	return msgSamples.map((bit, idx) => bit != 0 ? carrSamples[idx] : -carrSamples[idx]);
}

function bspkModulation(bitStream, samplesPerBit, ampCarr, freqCarr, sampleRate) {
	const samples = bitStreamToSamples(bitStream, samplesPerBit);
    const timeStamps = samples.map((_, idx) => idx/sampleRate);
    const carrSamples = cosineWave(timeStamps, ampCarr, freqCarr);
    return modulateBpsk(samples, carrSamples);
}

function splitIntoPhases(bitStream) {
    if (bitStream.length % 2 === 1) {
        bitStream.push(0);
    }
    const inPhaseStream = bitStream.filter((el, idx) => idx % 2 === 1);
    const quadPhaseStream = bitStream.filter((el, idx) => idx % 2 === 0);
    return {inPhaseStream, quadPhaseStream};
}

function modulateQpsk(inPhaseMsgSamples, quadMsgSamples, inPhaseCarrSamples, quadPhaseCarrSamples) {
	const samples = bitStreamToSamples(bitStream, samplesPerBit);
    const inBpskSamples = modulateBpsk(inPhaseMsgSamples, inPhaseCarrSamples);
    const quadBpskSamples = modulateBpsk(quadMsgSamples, quadPhaseCarrSamples);
	return inBpskSamples.map((el, idx) => el + quadBpskSamples[idx]);
}

function qpskModulation(bitStream, samplesPerBit, ampCarr, freqCarr) {
    const {inPhaseStream, quadPhaseStream} = splitIntoPhases(bitStream);
    const inPhaseMsgSamples = bitStreamToSamples(inPhaseStream, samplesPerBit);
    const quadPhaseMsgSamples = bitStreamToSamples(quadPhaseStream, samplesPerBit);
    const timeStamps = inPhaseMsgSamples.map((_, idx) => idx/sampleRate);
    const inPhaseCarrSamples = cosineWave(timeStamps, ampCarr, freqCarr);
    const quadPhaseCarrSamples = sineWave(timeStamps, ampCarr, freqCarr);
    return modulateQpsk(inPhaseMsgSamples, quadMsgSamples, inPhaseCarrSamples, quadPhaseCarrSamples);
}
