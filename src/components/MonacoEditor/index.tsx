import React from "react";
import Editor, { loader, Monaco } from "@monaco-editor/react";
import { parse } from "jsonc-parser";
import { Loading } from "src/components/Loading";
import useConfig from "src/hooks/store/useConfig";
import useGraph from "src/hooks/store/useGraph";
import useStored from "src/hooks/store/useStored";
import { parser } from "src/utils/jsonParser";
import styled from "styled-components";

loader.config({
  paths: {
    vs: "https://cdn.bootcdn.net/ajax/libs/monaco-editor/0.34.1/min/vs",
  },
});

const editorOptions = {
  formatOnPaste: true,
  minimap: {
    enabled: false,
  },
};

const StyledWrapper = styled.div`
  display: grid;
  height: calc(100vh - 36px);
  grid-template-columns: 100%;
  grid-template-rows: minmax(0, 1fr);
`;

function handleEditorWillMount(monaco: Monaco) {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    allowComments: true,
    comments: "ignore",
  });
}

/**
 * 将一个json对象进行递归遍历，如果是一个数组的话只截取第一个对象，如果递归的层级控制在三层
 * @param jsonObj 要递归遍历的json对象
 * @param incrementNum 遍历的第几层
 */
function trcateJson(jsonObj:object,incrementNum:number){
  for(let item in jsonObj){
    let itemValue = jsonObj[item]
    if(incrementNum >= 4){
      jsonObj[item] = undefined
    }
    if(typeof itemValue == "object"){
      if(incrementNum >= 3){
        jsonObj[item] = undefined
      }else{
        //是数组的话只取第一个，对象的话就是他本身
        if(itemValue.length){
          itemValue = itemValue[0]
        }
        trcateJson(itemValue,incrementNum+1)
      }
    }
  }
}

export const MonacoEditor = ({
  setHasError,
}: {
  setHasError: (value: boolean) => void;
}) => {
  const json = useConfig(state => state.json);
  const expand = useConfig(state => state.expand);
  const setJson = useConfig(state => state.setJson);
  const setGraphValue = useGraph(state => state.setGraphValue);
  const lightmode = useStored(state => (state.lightmode ? "light" : "vs-dark"));
  const [value, setValue] = React.useState<string | undefined>("");

  React.useEffect(() => {
    const { nodes, edges } = parser(json, expand);

    setGraphValue("loading", true);
    setGraphValue("nodes", nodes);
    setGraphValue("edges", edges);
    setValue(json);
  }, [expand, json, setGraphValue]);

  React.useEffect(() => {
    const formatTimer = setTimeout(() => {
      if (!value) {
        setHasError(false);
        return setJson("{}");
      }

      const errors = [];
      
      let parsedJSON = JSON.stringify(parse(value, errors), null, 2);
      
      if (errors.length) return setHasError(true);

      /**
       * 写这段代码的目的是为了让前端的同事能够更加清晰的看到后端AIP返回数据的层次结构，前端同事最多关注三层的结构，不需要太多的数据
       */

      let jsonvalue = JSON.parse(parsedJSON);
      //如果是一个数组或者集合，那么只取第一条记录
      if(jsonvalue.length){
        jsonvalue = jsonvalue[0];
      }
      //如果是一个对象，那么判断是不是项目api返回的对象（包含success和data的对象），如果是拆开这个对象
      if(jsonvalue["success"] && jsonvalue["data"]){
        let dataValue = jsonvalue["data"];
        if(dataValue.length){
          jsonvalue = dataValue[0];
        }else{
          jsonvalue = dataValue;
        }
      }
      trcateJson(jsonvalue,1);

      let resultValue = JSON.stringify(jsonvalue, null, 2);
      //setJson(parsedJSON);
      setJson(resultValue);
      setHasError(false);
    }, 1200);

    return () => clearTimeout(formatTimer);
  }, [value, setJson, setHasError]);

  return (
    <StyledWrapper>
      <Editor
        height="100%"
        defaultLanguage="json"
        value={value}
        theme={lightmode}
        options={editorOptions}
        onChange={setValue}
        loading={<Loading message="Loading Editor..." />}
        beforeMount={handleEditorWillMount}
      />
    </StyledWrapper>
  );
};
